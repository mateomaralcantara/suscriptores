import { serviceRoleRest } from "@/lib/supabase-server";

type CompletedOrder = { external_service_id: string | null; created_at: string; updated_at: string };

let cache: { at: number; data: Record<string, number> } | null = null;

/**
 * Average completion time per public service ID, in minutes, from the last 10 completed orders of
 * each service (like the "average time" big panels show). Cached for 10 minutes.
 */
export async function getAverageCompletionMinutes(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.data;
  const rows = await serviceRoleRest<CompletedOrder[]>(
    "orders?status=eq.completed&external_service_id=not.is.null&select=external_service_id,created_at,updated_at&order=updated_at.desc&limit=3000",
  );
  const samples: Record<string, number[]> = {};
  for (const row of rows) {
    const id = row.external_service_id as string;
    const minutes = (Date.parse(row.updated_at) - Date.parse(row.created_at)) / 60000;
    if (!Number.isFinite(minutes) || minutes < 0) continue;
    const list = (samples[id] ??= []);
    if (list.length < 10) list.push(minutes);
  }
  const data = Object.fromEntries(Object.entries(samples).map(([id, list]) => [id, Math.round(list.reduce((a, b) => a + b, 0) / list.length)]));
  cache = { at: Date.now(), data };
  return data;
}
