import { NextResponse } from "next/server";
import { getUsdToCadRate } from "@/lib/currency";

export async function GET() {
  const usdToCad = await getUsdToCadRate();
  return NextResponse.json({ usdToCad });
}
