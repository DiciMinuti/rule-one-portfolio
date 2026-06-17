import { NextResponse } from "next/server";
import { searchCompanies } from "@/lib/data/sec";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  try {
    const results = await searchCompanies(query);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed." },
      { status: 502 },
    );
  }
}
