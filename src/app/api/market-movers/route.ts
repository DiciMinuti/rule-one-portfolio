import { NextResponse } from "next/server";
import { getMarketMovers } from "@/lib/data/market-movers";

export async function GET() {
  try {
    const movers = await getMarketMovers();
    return NextResponse.json({ movers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Market movers request failed." },
      { status: 500 },
    );
  }
}
