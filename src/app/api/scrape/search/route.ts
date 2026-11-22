import { NextRequest, NextResponse } from "next/server";
import { scrapeSearch, SubIndoProvider } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const provider = (searchParams.get("provider") as SubIndoProvider | "all") || "all";

  if (!q || !q.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: "Parameter query 'q' (judul anime) diperlukan",
      },
      { status: 400 }
    );
  }

  const result = await scrapeSearch(q, provider);

  return NextResponse.json(result, {
    status: result.success ? 200 : result.status || 500,
  });
}
