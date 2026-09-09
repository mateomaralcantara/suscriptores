import { NextResponse } from "next/server";
import { ensureProfileForUser, getUserFromRequest, getWalletForProfile } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/api";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const profile = await ensureProfileForUser(user);
    const wallet = await getWalletForProfile(profile.id);
    return NextResponse.json({
      success: true,
      currency: wallet?.currency ?? "USD",
      available: (wallet?.available_minor ?? 0) / 100,
      reserved: (wallet?.reserved_minor ?? 0) / 100,
      promotional: (wallet?.promotional_minor ?? 0) / 100,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
