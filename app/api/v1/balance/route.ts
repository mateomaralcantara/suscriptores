import { json } from "@/lib/api";
export async function GET() { return json({ success: true, mode: "sandbox", currency: "USD", available: 12480.5, reserved: 1245.2, promotional: 420 }); }
