import { NextResponse } from "next/server";
import { internalError, readJsonObject } from "@/lib/api";
import { generateApiKey } from "@/lib/api-keys";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { ensureProfileForUser, getUserFromRequest, listApiKeys, serviceRoleRest } from "@/lib/supabase-server";

const MAX_KEYS = 5;
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  try {
    const profile = await ensureProfileForUser(user);
    return NextResponse.json({ success: true, data: await listApiKeys(profile.id) });
  } catch (error) {
    return internalError("account/api-keys", error);
  }
}

/** Creates a key. The full key is returned only once. */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const limited = rateLimit(`api-keys:${user.id}`, 10, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = (await readJsonObject(request)) ?? {};
  const name = String(body.name ?? "").trim().slice(0, 60) || "Clave API";
  try {
    const profile = await ensureProfileForUser(user);
    if ((await listApiKeys(profile.id)).length >= MAX_KEYS) {
      return NextResponse.json({ success: false, error: `Máximo ${MAX_KEYS} claves activas. Revoca una antes de crear otra.` }, { status: 409 });
    }
    const { key, prefix, hash } = generateApiKey();
    await serviceRoleRest("api_keys", {
      method: "POST",
      body: JSON.stringify({ tenant_id: profile.tenant_id ?? null, user_id: profile.id, name, key_prefix: prefix, secret_hash: hash }),
    });
    return NextResponse.json({ success: true, key, prefix, name }, { status: 201 });
  } catch (error) {
    return internalError("account/api-keys", error);
  }
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ success: false, error: "Clave no encontrada." }, { status: 404 });
  try {
    const profile = await ensureProfileForUser(user);
    await serviceRoleRest(`api_keys?id=eq.${id}&user_id=eq.${encodeURIComponent(profile.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "revoked" }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("account/api-keys", error);
  }
}
