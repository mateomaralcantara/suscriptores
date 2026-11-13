import { serviceRoleRest } from "@/lib/supabase-server";

export const TICKET_CATEGORIES = ["Pedidos", "Pagos", "API", "Refill", "Cuenta", "Otro"] as const;
export const TICKET_PRIORITIES = ["Baja", "Media", "Alta"] as const;

export type TicketRow = {
  id: string; public_id: string; user_id: string; category: string; priority: string;
  subject: string; status: string; created_at: string; updated_at: string;
};
export type TicketMessageRow = { id: string; body: string; internal: boolean; created_at: string; author_id: string; profiles: { email: string; role: string } | null };

const TICKET_FIELDS = "id,public_id,user_id,category,priority,subject,status,created_at,updated_at";

export function listTicketsForProfile(profileId: string) {
  return serviceRoleRest<TicketRow[]>(`tickets?user_id=eq.${encodeURIComponent(profileId)}&select=${TICKET_FIELDS}&order=updated_at.desc&limit=200`);
}

export function listAllTickets(status?: string) {
  const filter = status && /^[a-z]+$/.test(status) ? `&status=eq.${status}` : "";
  return serviceRoleRest<(TicketRow & { profiles: { email: string } | null })[]>(
    `tickets?select=${TICKET_FIELDS},profiles!tickets_user_id_fkey(email)${filter}&order=updated_at.desc&limit=300`,
  );
}

/** Loads a ticket the viewer may see (own ticket, or any ticket for staff) with its visible messages. */
export async function getTicketForViewer(publicId: string, viewer: { profileId: string; isStaff: boolean }) {
  const owner = viewer.isStaff ? "" : `&user_id=eq.${encodeURIComponent(viewer.profileId)}`;
  const rows = await serviceRoleRest<TicketRow[]>(`tickets?public_id=eq.${encodeURIComponent(publicId)}${owner}&select=${TICKET_FIELDS}&limit=1`);
  const ticket = rows[0];
  if (!ticket) return null;
  const internal = viewer.isStaff ? "" : "&internal=eq.false";
  const messages = await serviceRoleRest<TicketMessageRow[]>(
    `ticket_messages?ticket_id=eq.${ticket.id}${internal}&select=id,body,internal,created_at,author_id,profiles(email,role)&order=created_at.asc`,
  );
  return { ticket, messages };
}
