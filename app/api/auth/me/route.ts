import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminEmail } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, isAdmin: isAdminEmail(user.email) },
  });
}
