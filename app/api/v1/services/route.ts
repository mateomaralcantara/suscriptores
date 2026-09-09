import { NextResponse } from "next/server";
import { orderServices } from "@/lib/order-services";

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "sandbox",
    count: orderServices.length,
    services: orderServices,
  });
}
