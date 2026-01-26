import { handle } from "@upstash/realtime";
import { realtime } from "@/app/lib/realtime";

export const GET = handle({ realtime });
