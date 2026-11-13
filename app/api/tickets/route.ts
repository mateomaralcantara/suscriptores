import { NextResponse } from "next/server";
import { internalError, readJsonObject } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { ensureProfileForUser, getUserFromRequest, supabaseRpc } from "@/lib/supabase-server";
import { listTicketsForProfile, TICKET_CATEGORIES, TICKET_PRIORITIES } from "@/lib/tickets";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  try {
    const profile = await ensureProfileForUser(user);
    return NextResponse.json({ success: true, data: await listTicketsForProfile(profile.id) });
  } catch (error) {
    return internalError("tickets", error);
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const limited = rateLimit(`tickets:${user.id}`, 10, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = await readJsonObject(request);
  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();
  const category = String(body?.category ?? "");
  const priority = String(body?.priority ?? "Media");
  if (!subject || subject.length > 200 || !message || message.length > 5000
    || !(TICKET_CATEGORIES as readonly string[]).includes(category) || !(TICKET_PRIORITIES as readonly string[]).includes(priority)) {
    return NextResponse.json({ success: false, error: "Asunto (máx. 200), categoría, prioridad y mensaje (máx. 5000) son obligatorios." }, { status: 400 });
  }
  try {
    const profile = await ensureProfileForUser(user);
    const publicId = await supabaseRpc<string>("create_ticket", {
      p_profile_id: profile.id, p_subject: subject, p_category: category, p_priority: priority, p_body: message,
    });
    return NextResponse.json({ success: true, id: publicId }, { status: 201 });
  } catch (error) {
    return internalError("tickets", error);
  }
}
