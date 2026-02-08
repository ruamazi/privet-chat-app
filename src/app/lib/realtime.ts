import z from "zod";
import { redis } from "./redis";
import { InferRealtimeEvents, Realtime } from "@upstash/realtime";

const messageSchema = z.object({
 id: z.string(),
 sender: z.string(),
 text: z.string(),
 timestamp: z.number(),
 roomId: z.string(),
 token: z.string().optional(),
 encrypted: z.boolean().optional(),
 reactions: z.record(z.string(), z.array(z.string())).optional(),
 readBy: z.array(z.string()).optional(),
 edited: z.boolean().optional(),
 editedAt: z.number().optional(),
 deleted: z.boolean().optional(),
});

const destroySchema = z.object({
 isDestroyed: z.literal(true),
});

const messageEditedSchema = z.object({
 messageId: z.string(),
 text: z.string(),
 editedAt: z.number(),
});

const messageDeletedSchema = z.object({
 messageId: z.string(),
});

const reactionSchema = z.object({
 messageId: z.string(),
 emoji: z.string(),
 user: z.string(),
 added: z.boolean(),
});

const readReceiptSchema = z.object({
 messageId: z.string(),
 user: z.string(),
});

const typingSchema = z.object({
 user: z.string(),
 isTyping: z.boolean(),
});

const schema = {
 chat: {
  message: messageSchema,
  destroy: destroySchema,
  messageEdited: messageEditedSchema,
  messageDeleted: messageDeletedSchema,
  reaction: reactionSchema,
  readReceipt: readReceiptSchema,
  typing: typingSchema,
 },
};

export const realtime = new Realtime({ schema, redis });
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
export type Message = z.infer<typeof messageSchema>;
export type Destroy = z.infer<typeof destroySchema>;
