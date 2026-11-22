import { NextRequest, NextResponse } from "next/server";
import { getSankaBaseUrl, DEFAULT_USER_AGENT, cleanAnimeTitle } from "@/lib/scraper";
import { extractBaseTitle, detectSeason, SeasonItem } from "@/lib/season-utils";

export const dynamic = "force-dynamic";

// In-memory cache for season lookups (1 hour TTL)
interface CacheEntry {
  data: {
    baseTitle: string;
    seasons: SeasonItem[];
  };
  timestamp: number;
}
const seasonCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawTitle = searchParams.get("title") || "";
  const currentSlug = searchParams.get("slug") || "";

  if (!rawTitle && !currentSlug) {
    return NextResponse.json(
      { success: false, error: "Parameter 'title' atau 'slug' diperlukan" },
      { status: 400 }
    );
  }

  const baseTitle = extractBaseTitle(rawTitle || currentSlug.replace(/-/g, " "));
  const cacheKey = baseTitle.toLowerCase().replace(/[^a-z0-9]/g, "");

  const cached = seasonCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      success: true,
      baseTitle: cached.data.baseTitle,
      seasons: cached.data.seasons,
      cached: true,
    });
  }

  const baseUrl = getSankaBaseUrl();
  const cleanQ = cleanAnimeTitle(baseTitle);

  try {
    const res = await fetch(`${baseUrl}/anime/search/${encodeURIComponent(cleanQ)}`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({
        success: true,
        baseTitle,
        seasons: [],
      });
    }

    const json = await res.json();
    const rawList: any[] = json.data?.animeList || [];

    // Filter items that actually belong to this franchise base title
    const seasonItems: SeasonItem[] = [];
    const seenSlugs = new Set<string>();

    rawList.forEach((item: any) => {
      const itemTitle = item.title || "";
      const itemSlug = String(item.slug || item.animeId || "").trim();
      if (!itemSlug || seenSlugs.has(itemSlug)) return;

      const itemBase = extractBaseTitle(itemTitle, itemSlug);
      // Check if base title matches closely
      const match =
        itemBase.toLowerCase().includes(baseTitle.toLowerCase()) ||
        baseTitle.toLowerCase().includes(itemBase.toLowerCase());

      if (match) {
        seenSlugs.add(itemSlug);
        const { seasonLabel, seasonNumber } = detectSeason(itemTitle, itemSlug);
        seasonItems.push({
          id: itemSlug,
          slug: itemSlug,
          title: itemTitle,
          seasonLabel,
          seasonNumber,
          poster: item.poster || "",
          episodes: item.episodes || null,
        });
      }
    });

    // Sort by season number ascending (S1, S2, S3, Movie, OVA)
    seasonItems.sort((a, b) => a.seasonNumber - b.seasonNumber);

    seasonCache.set(cacheKey, {
      data: { baseTitle, seasons: seasonItems },
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      baseTitle,
      seasons: seasonItems,
      cached: false,
    });
  } catch (err: any) {
    console.warn("Season search error:", err);
    return NextResponse.json({
      success: true,
      baseTitle,
      seasons: [],
    });
  }
}
