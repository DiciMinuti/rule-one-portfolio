import { NextResponse } from "next/server";
import { getCompanyFilings } from "@/lib/data/sec";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;

  try {
    const filings = await getCompanyFilings(symbol);
    return NextResponse.json({ filings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Company filings failed." },
      { status: 502 },
    );
  }
}
