import { redis } from "@/app/lib/redis";
import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authMiddleware } from "./auth";
import { Message, realtime } from "@/app/lib/realtime";
import { RateLimiter } from "@/lib/rate-limit";
import { E2EE } from "@/lib/e2ee";

const DEFAULT_ROOM_TTL_SECONDS = 60 * 10; // 10 minutes

interface RoomMeta {
 connected: string[];
 createdAt: number;
 ttlSeconds: number;
 passwordHash?: string;
 encryptionKeyHash?: string;
 [key: string]: unknown;
}

interface ExtendedMessage extends Message {
 edited?: boolean;
 editedAt?: number;
 deleted?: boolean;
 reactions?: Record<string, string[]>;
 readBy?: string[];
}

const rooms = new Elysia({ prefix: "/room" })
 .post(
  "/create",
  async ({ body }) => {
   const roomId = nanoid();
   const ttlSeconds = body?.ttlSeconds || DEFAULT_ROOM_TTL_SECONDS;
   const passwordHash = body?.password ? E2EE.hashPassword(body.password) : undefined;
   const encryptionKey = body?.enableEncryption ? E2EE.generateRoomKey() : undefined;

    const meta: RoomMeta = {
     connected: [],
     createdAt: Date.now(),
     ttlSeconds,
    };

    // Only add optional fields if they have values
    if (passwordHash) {
     meta.passwordHash = passwordHash;
    }
    if (encryptionKey?.hash) {
     meta.encryptionKeyHash = encryptionKey.hash;
    }

    await redis.hset(`meta:${roomId}`, meta as unknown as Record<string, unknown>);
   await redis.expire(`meta:${roomId}`, ttlSeconds);

   const response: { roomId: string; encryptionKey?: string } = { roomId };
   if (encryptionKey) {
    response.encryptionKey = encryptionKey.key;
   }

   return response;
  },
  {
   body: z.object({
    ttlSeconds: z.number().min(60).max(86400).optional(),
    password: z.string().min(4).max(50).optional(),
    enableEncryption: z.boolean().optional(),
   }),
  },
 )
 .post(
  "/verify-password",
  async ({ body }) => {
   const { roomId, password } = body;
   const meta = await redis.hgetall<RoomMeta>(`meta:${roomId}`);
   
   if (!meta) {
    return { valid: false, error: "Room not found" };
   }

   if (!meta.passwordHash) {
    return { valid: true };
   }

   const passwordHash = E2EE.hashPassword(password);
   const valid = passwordHash === meta.passwordHash;

   return { valid };
  },
  {
   body: z.object({
    roomId: z.string(),
    password: z.string(),
   }),
  },
 )
 .use(authMiddleware)
 .get(
  "/ttl",
  async ({ auth }) => {
   const ttl = await redis.ttl(`meta:${auth.roomId}`);
   return { ttl: ttl > 0 ? ttl : 0 };
  },
  { query: z.object({ roomId: z.string() }) },
 )
 .delete(
  "/",
  async ({ auth }) => {
   await realtime
    .channel(auth.roomId)
    .emit("chat.destroy", { isDestroyed: true });

   await Promise.all([
    redis.del(auth.roomId),
    redis.del(`meta:${auth.roomId}`),
    redis.del(`messages:${auth.roomId}`),
    redis.del(`typing:${auth.roomId}`),
    redis.del(`reactions:${auth.roomId}`),
   ]);
  },
  { query: z.object({ roomId: z.string() }) },
 );

const messages = new Elysia({ prefix: "/messages" })
 .use(authMiddleware)
 .post(
  "/",
  async ({ body, auth }) => {
    // Rate limiting
    const rateLimit = await RateLimiter.checkUser(auth.token);
    if (!rateLimit.allowed) {
     throw new Error("Rate limit exceeded. Please wait before sending more messages.");
    }

   const { sender, text, encrypted } = body;
   const { roomId } = auth;
   
   const roomExists = await redis.exists(`meta:${roomId}`);
   if (!roomExists) {
    throw new Error("Room not found");
   }

   const message: ExtendedMessage = {
    id: nanoid(),
    sender,
    text,
    timestamp: Date.now(),
    roomId,
    encrypted: encrypted || false,
    reactions: {},
    readBy: [auth.token],
   };

   await redis.rpush(`messages:${roomId}`, { ...message, token: auth.token });
   await realtime.channel(roomId).emit("chat.message", message);
   
   const remaining = await redis.ttl(`meta:${roomId}`);
   await Promise.all([
    redis.expire(`messages:${roomId}`, remaining),
   ]);

   return { success: true, messageId: message.id };
  },
  {
   query: z.object({ roomId: z.string() }),
   body: z.object({
    sender: z.string().max(100),
    text: z.string().max(1000),
    encrypted: z.boolean().optional(),
   }),
  },
 )
 .put(
  "/:messageId",
  async ({ params, body, auth }) => {
   const { roomId } = auth;
   const { messageId } = params;
   
   const messages = await redis.lrange<ExtendedMessage>(`messages:${roomId}`, 0, -1);
   const messageIndex = messages.findIndex((m) => m.id === messageId);
   
   if (messageIndex === -1) {
    throw new Error("Message not found");
   }

   const message = messages[messageIndex];
   
   // Only allow editing within 5 minutes and only by the sender
   const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
   if (message.timestamp < fiveMinutesAgo) {
    throw new Error("Message can no longer be edited");
   }

   // Verify sender (check token)
   const messageWithToken = await redis.lrange<ExtendedMessage & { token: string }>(
    `messages:${roomId}`,
    messageIndex,
    messageIndex,
   );
   if (messageWithToken[0]?.token !== auth.token) {
    throw new Error("You can only edit your own messages");
   }

   message.text = body.text;
   message.edited = true;
   message.editedAt = Date.now();

   // Update in Redis
   await redis.lset(`messages:${roomId}`, messageIndex, { ...message, token: auth.token });
   await realtime.channel(roomId).emit("chat.messageEdited", { messageId, text: body.text, editedAt: message.editedAt });

   return { success: true };
  },
  {
   params: z.object({ messageId: z.string() }),
   body: z.object({ text: z.string().max(1000) }),
  },
 )
 .delete(
  "/:messageId",
  async ({ params, auth }) => {
   const { roomId } = auth;
   const { messageId } = params;
   
   const messages = await redis.lrange<ExtendedMessage>(`messages:${roomId}`, 0, -1);
   const messageIndex = messages.findIndex((m) => m.id === messageId);
   
   if (messageIndex === -1) {
    throw new Error("Message not found");
   }

   const message = messages[messageIndex];
   
   // Only allow deletion within 5 minutes and only by the sender
   const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
   if (message.timestamp < fiveMinutesAgo) {
    throw new Error("Message can no longer be deleted");
   }

   // Verify sender (check token)
   const messageWithToken = await redis.lrange<ExtendedMessage & { token: string }>(
    `messages:${roomId}`,
    messageIndex,
    messageIndex,
   );
   if (messageWithToken[0]?.token !== auth.token) {
    throw new Error("You can only delete your own messages");
   }

   message.deleted = true;
   message.text = "[Message deleted]";

   // Update in Redis
   await redis.lset(`messages:${roomId}`, messageIndex, { ...message, token: auth.token });
   await realtime.channel(roomId).emit("chat.messageDeleted", { messageId });

   return { success: true };
  },
  {
   params: z.object({ messageId: z.string() }),
  },
 )
 .post(
  "/:messageId/reactions",
  async ({ params, body, auth }) => {
   const { roomId } = auth;
   const { messageId } = params;
   const { emoji } = body;

   const messages = await redis.lrange<ExtendedMessage>(`messages:${roomId}`, 0, -1);
   const messageIndex = messages.findIndex((m) => m.id === messageId);

   if (messageIndex === -1) {
    throw new Error("Message not found");
   }

   const message = messages[messageIndex];
   if (!message.reactions) {
    message.reactions = {};
   }

   if (!message.reactions[emoji]) {
    message.reactions[emoji] = [];
   }

   // Toggle reaction
   const userIndex = message.reactions[emoji].indexOf(auth.token);
   if (userIndex > -1) {
    message.reactions[emoji].splice(userIndex, 1);
    if (message.reactions[emoji].length === 0) {
     delete message.reactions[emoji];
    }
   } else {
    message.reactions[emoji].push(auth.token);
   }

   await redis.lset(`messages:${roomId}`, messageIndex, { ...message, token: auth.token });
   await realtime.channel(roomId).emit("chat.reaction", { messageId, emoji, user: auth.token, added: userIndex === -1 });

   return { success: true };
  },
  {
   params: z.object({ messageId: z.string() }),
   body: z.object({ emoji: z.string() }),
  },
 )
 .post(
  "/:messageId/read",
  async ({ params, auth }) => {
   const { roomId } = auth;
   const { messageId } = params;

   const messages = await redis.lrange<ExtendedMessage>(`messages:${roomId}`, 0, -1);
   const messageIndex = messages.findIndex((m) => m.id === messageId);

   if (messageIndex === -1) {
    throw new Error("Message not found");
   }

   const message = messages[messageIndex];
   if (!message.readBy) {
    message.readBy = [];
   }

   if (!message.readBy.includes(auth.token)) {
    message.readBy.push(auth.token);
    await redis.lset(`messages:${roomId}`, messageIndex, { ...message, token: auth.token });
    await realtime.channel(roomId).emit("chat.readReceipt", { messageId, user: auth.token });
   }

   return { success: true };
  },
  {
   params: z.object({ messageId: z.string() }),
  },
 )
 .get(
  "/",
  async ({ auth }) => {
   const { roomId } = auth;
   const messages = await redis.lrange<ExtendedMessage>(`messages:${roomId}`, 0, -1);
   return {
    messages: messages.map((m) => ({
     ...m,
     token: undefined,
     isOwn: m.sender === auth.token,
    })),
   };
  },
  { query: z.object({ roomId: z.string() }) },
 );

// Typing indicators
const typing = new Elysia({ prefix: "/typing" })
 .use(authMiddleware)
 .post(
  "/",
  async ({ body, auth }) => {
   const { roomId } = auth;
   const { isTyping } = body;

   await redis.hset(`typing:${roomId}`, {
    [auth.token]: isTyping ? Date.now() : 0,
   });

   await realtime.channel(roomId).emit("chat.typing", { user: auth.token, isTyping });
   
   // Auto-clear typing status after 5 seconds
   if (isTyping) {
    setTimeout(async () => {
     await redis.hset(`typing:${roomId}`, { [auth.token]: 0 });
     await realtime.channel(roomId).emit("chat.typing", { user: auth.token, isTyping: false });
    }, 5000);
   }

   return { success: true };
  },
  {
   body: z.object({ isTyping: z.boolean() }),
  },
 )
 .get(
  "/",
  async ({ auth }) => {
   const { roomId } = auth;
   const typingData = await redis.hgetall<Record<string, number>>(`typing:${roomId}`);
   const now = Date.now();
   const activeUsers = Object.entries(typingData || {})
     .filter(([, timestamp]) => timestamp > 0 && now - timestamp < 6000)
    .map(([token]) => token);

   return { activeUsers };
  },
 );

const app = new Elysia({ prefix: "/api" })
 .use(rooms)
 .use(messages)
 .use(typing);

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;

export type App = typeof app;
