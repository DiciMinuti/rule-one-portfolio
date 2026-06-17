import { NextResponse } from "next/server";
import { getCompanyFinancials } from "@/lib/data/sec";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;

  try {
    const financials = await getCompanyFinancials(symbol);
    return NextResponse.json({ financials });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Company facts failed." },
      { status: 502 },
    );
  }
}
