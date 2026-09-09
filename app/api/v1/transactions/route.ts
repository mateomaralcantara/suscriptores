import { NextResponse } from "next/server";
import { ensureProfileForUser, getUserFromRequest, listTransactionsForProfile } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/api";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const profile = await ensureProfileForUser(user);
    const transactions = await listTransactionsForProfile(profile.id);
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
