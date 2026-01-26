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
});

const destroySchema = z.object({
 isDestroyed: z.literal(true),
});

const schema = {
 chat: {
  message: messageSchema,
  destroy: destroySchema,
 },
};

export const realtime = new Realtime({ schema, redis });
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
export type Message = z.infer<typeof messageSchema>;
export type Destroy = z.infer<typeof destroySchema>;
