import { treaty } from "@elysiajs/eden";
import type { App } from "../api/[[...slugs]]/route";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "localhost:3000";

export const client = treaty<App>(API_URL).api;
