import { NextResponse } from "next/server";
import { getCompanyProfile } from "@/lib/data/sec";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;

  try {
    const profile = await getCompanyProfile(symbol);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Company profile failed." },
      { status: 502 },
    );
  }
}
