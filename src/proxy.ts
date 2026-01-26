import { NextRequest, NextResponse } from "next/server";
import { redis } from "./app/lib/redis";
import { nanoid } from "nanoid";

export const proxy = async (req: NextRequest) => {
 // getting exact room
 const pathname = req.nextUrl.pathname;
 const roomMatch = pathname.match(/^\/room\/([^/]+)$/);

 if (!roomMatch) {
  return NextResponse.redirect(new URL("/", req.url));
 }
 // getting room id
 const roomId = roomMatch[1];

 // getting who has access to room and who dosent from redis.
 const meta = await redis.hgetall<{ connected: string[]; createdAt: number }>(
  `meta:${roomId}`,
 );
 if (!meta) {
  return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
 }

 // checking if user has a token
 const existingToken = req.cookies.get("x-auth-token")?.value;
 // if user has a token and is in the room we let him pass
 if (existingToken && meta.connected.includes(existingToken)) {
  return NextResponse.next();
 }
 // if room is full we redirect to home page
 if (meta.connected.length >= 2) {
  return NextResponse.redirect(new URL("/?error=room-full", req.url));
 }
 // creating a response
 const resp = NextResponse.next();
 const token = nanoid();
 // sending token with response
 resp.cookies.set("x-auth-token", token, {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
 });

 // pushing the new user to the room
 await redis.hset(`meta:${roomId}`, { connected: [...meta.connected, token] });

 return resp;
};

export const config = {
 matcher: "/room/:path*",
};
