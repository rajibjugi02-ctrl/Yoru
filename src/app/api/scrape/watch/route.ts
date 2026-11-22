import { NextRequest, NextResponse } from "next/server";
import {
  scrapeWatch,
  findSamehadakuEpisodeSlug,
  findOtakudesuEpisodeSlug,
  findKuramanimeEpisodeStream,
  SubIndoProvider,
} from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let episodeSlug = searchParams.get("episodeSlug") || searchParams.get("slug");
  const animeTitle = searchParams.get("animeTitle");
  const episodeNumber = searchParams.get("episodeNumber");
  const serverId =
    searchParams.get("serverId") ||
    searchParams.get("mirrorData") ||
    searchParams.get("dataContent") ||
    undefined;
  const provider = (searchParams.get("provider") as SubIndoProvider) || "otakudesu";

  // Dedicated flow for Kuramanime
  if (provider === "kuramanime") {
    if (animeTitle && episodeNumber) {
      const kuraResult = await findKuramanimeEpisodeStream(animeTitle, Number(episodeNumber));
      if (kuraResult.success) {
        return NextResponse.json(kuraResult, { status: 200 });
      } else if (episodeSlug && episodeSlug.trim()) {
        const fallbackWatch = await scrapeWatch(episodeSlug, serverId, "kuramanime");
        if (fallbackWatch.success) {
          return NextResponse.json(fallbackWatch, { status: 200 });
        }
      }
      return NextResponse.json(kuraResult, { status: kuraResult.status || 503 });
    } else if (episodeSlug && episodeSlug.trim()) {
      const kuraWatch = await scrapeWatch(episodeSlug, serverId, "kuramanime");
      return NextResponse.json(kuraWatch, { status: kuraWatch.success ? 200 : kuraWatch.status || 503 });
    }
    return NextResponse.json(
      {
        success: false,
        provider: "kuramanime",
        error: "Parameter animeTitle & episodeNumber diperlukan untuk provider Kuramanime",
      },
      { status: 400 }
    );
  }

  // Auto-resolve episode slug if not provided or if synthetic for Otakudesu / Samehadaku
  if (!episodeSlug && animeTitle && episodeNumber) {
    const num = Number(episodeNumber);
    const resolvedSlug =
      provider === "samehadaku"
        ? await findSamehadakuEpisodeSlug(animeTitle, num)
        : await findOtakudesuEpisodeSlug(animeTitle, num);
    if (resolvedSlug) {
      episodeSlug = resolvedSlug;
    }
  }

  let result = null;
  if (episodeSlug && episodeSlug.trim()) {
    result = await scrapeWatch(episodeSlug, serverId, provider);
  }

  // Fallback: If initial scrape failed (or slug was synthetic) and we have animeTitle + episodeNumber, resolve real slug
  if ((!result || !result.success) && animeTitle && episodeNumber) {
    const num = Number(episodeNumber);
    const resolvedSlug =
      provider === "samehadaku"
        ? await findSamehadakuEpisodeSlug(animeTitle, num)
        : await findOtakudesuEpisodeSlug(animeTitle, num);

    if (resolvedSlug && resolvedSlug !== episodeSlug) {
      result = await scrapeWatch(resolvedSlug, serverId, provider);
    }
  }

  if (!result || !result.success) {
    return NextResponse.json(
      result || {
        success: false,
        error: `Episode ${episodeNumber || ""} belum tersedia di server ${provider}.`,
      },
      { status: result?.status || 404 }
    );
  }

  return NextResponse.json(result, {
    status: 200,
  });
}
