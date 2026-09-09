import { NextResponse } from "next/server";
import { getSmmServices } from "@/lib/providers/smm-panel";

export async function GET() {
  try {
    const services = await getSmmServices();

    return NextResponse.json({
      ok: true,
      provider: "smm-panel",
      services,
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