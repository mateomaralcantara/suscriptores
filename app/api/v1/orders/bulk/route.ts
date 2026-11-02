import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  return NextResponse.json(
    {
      success: false,
      error: "Los pedidos masivos están deshabilitados hasta implementar reserva atómica e idempotencia por cada fila.",
    },
    { status: 501 },
  );
}
