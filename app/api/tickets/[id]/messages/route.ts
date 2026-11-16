import { NextResponse } from "next/server";
import { errorMessage, internalError, readJsonObject } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { ensureAdminProfile, getUserFromRequest, isAdminUser, supabaseRpc } from "@/lib/supabase-server";
import { getTicketForViewer } from "@/lib/tickets";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const limited = rateLimit(`ticket-msg:${user.id}`, 30, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = await readJsonObject(request);
  const message = String(body?.message ?? "").trim();
  if (!message || message.length > 5000) return NextResponse.json({ success: false, error: "El mensaje es obligatorio (máx. 5000)." }, { status: 400 });

  try {
    const { id } = await params;
    const profile = await ensureAdminProfile(user);
    const isStaff = isAdminUser(user);
    const found = await getTicketForViewer(id, { profileId: profile.id, isStaff });
    if (!found) return NextResponse.json({ success: false, error: "Ticket no encontrado." }, { status: 404 });
    const status = await supabaseRpc<string>("add_ticket_message", {
      p_profile_id: profile.id, p_ticket_id: found.ticket.id, p_body: message, p_internal: isStaff && body?.internal === true,
    });
    return NextResponse.json({ success: true, status }, { status: 201 });
  } catch (error) {
    if (errorMessage(error).includes("ticket_closed")) return NextResponse.json({ success: false, error: "El ticket está cerrado." }, { status: 409 });
    return internalError("tickets/:id/messages", error);
  }
}
