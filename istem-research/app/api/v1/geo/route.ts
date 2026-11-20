import { apiError, fail, json, requireApiSession } from "@/lib/api";
import { listGeoAreas } from "@/lib/data";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const country = (new URL(request.url).searchParams.get("country") ?? "DO").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return fail(400, "País no válido.");
  try {
    return json({ ok: true, data: await listGeoAreas(session.token, country) });
  } catch (error) {
    return apiError("v1/geo:get", error);
  }
}
