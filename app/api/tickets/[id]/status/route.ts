import { NextResponse } from "next/server";
import { internalError, readJsonObject } from "@/lib/api";
import { ensureAdminProfile, getUserFromRequest, isAdminUser, supabaseRpc } from "@/lib/supabase-server";
import { getTicketForViewer } from "@/lib/tickets";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const body = await readJsonObject(request);
  const status = String(body?.status ?? "");
  const isStaff = isAdminUser(user);
  if (!(isStaff ? ["open", "pending", "closed"] : ["closed"]).includes(status)) {
    return NextResponse.json({ success: false, error: "Estado no permitido." }, { status: 400 });
  }
  try {
    const { id } = await params;
    const profile = await ensureAdminProfile(user);
    const found = await getTicketForViewer(id, { profileId: profile.id, isStaff });
    if (!found) return NextResponse.json({ success: false, error: "Ticket no encontrado." }, { status: 404 });
    await supabaseRpc<string>("set_ticket_status", { p_profile_id: profile.id, p_ticket_id: found.ticket.id, p_status: status });
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return internalError("tickets/:id/status", error);
  }
}
