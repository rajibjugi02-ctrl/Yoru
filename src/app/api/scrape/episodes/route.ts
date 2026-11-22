import { NextRequest, NextResponse } from "next/server";
import { scrapeEpisodes, SubIndoProvider } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const provider = (searchParams.get("provider") as SubIndoProvider) || "otakudesu";

  if (!slug || !slug.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: "Parameter query 'slug' diperlukan",
      },
      { status: 400 }
    );
  }

  const result = await scrapeEpisodes(slug, provider);

  return NextResponse.json(result, {
    status: result.success ? 200 : result.status || 500,
  });
}
