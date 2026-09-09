import { NextResponse } from "next/server";
import { createSmmOrder } from "@/lib/providers/smm-panel";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const service = Number(body.service);
    const link = String(body.link);
    const quantity = Number(body.quantity);

    if (!service || !link || !quantity) {
      return NextResponse.json(
        { ok: false, error: "service, link and quantity are required" },
        { status: 400 },
      );
    }

    const order = await createSmmOrder({
      service,
      link,
      quantity,
    });

    return NextResponse.json({
      ok: true,
      provider: "smm-panel",
      order,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}