import { authenticate, handle, json } from "@/lib/api";

export const GET = handle(async (request) => json({ success: true, user: await authenticate(request) }));
