import { slugToHumanTitle } from "./season-utils";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function getSankaBaseUrl(): string {
  let url =
    process.env.SANKA_API_URL ||
    process.env.NEXT_PUBLIC_SANKA_API_URL ||
    "https://www.sankavollerei.web.id";
  return url.replace(/\/+$/, "");
}

export type SubIndoProvider = "otakudesu" | "samehadaku" | "kuramanime";

/**
 * Filter strict only for Vidhide and Mega (case-insensitive) for Otakudesu
 */
export function isVidhideOrMega(name: string): boolean {
  return /vidhide|mega/i.test(name);
}

/**
 * Format server name to clean title
 */
export function formatServerName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("kuramadrive") || n.includes("kurama")) return "Kuramadrive";
  if (n.includes("vidhide")) return "Vidhide";
  if (n.includes("mega")) return "Mega";
  if (n.includes("wibufile")) return "Wibufile";
  if (n.includes("blogger") || n.includes("blogspot")) return "Blogger";
  if (n.includes("desustream") || n.includes("odstream") || n.includes("odcdn")) return "Desustream";
  if (n.includes("archive")) return "Archive";
  return name.replace(/\s*\d+p/i, "").trim() || "Server";
}

/**
 * Clean anime title for search
 */
export function cleanAnimeTitle(title: string): string {
  if (!title) return "";
  return title
    .replace(/\s*\(\d{4}\)/gi, "")
    .replace(/\s*\(TV\)/gi, "")
    .replace(/\s*\(Dub\)/gi, "")
    .replace(/\s*\(Sub\)/gi, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract base anime title (without Season, Part, Year, etc.) for fallback keyword search
 */
export function extractBaseTitle(title: string): string {
  if (!title) return "";
  return title
    .replace(/\s*\(\d{4}\)/gi, "")
    .replace(/:\s*The\s*Final\s*Season.*/gi, "")
    .replace(/:\s*Final\s*Season.*/gi, "")
    .replace(/\s*The\s*Final\s*Season.*/gi, "")
    .replace(/\s*Final\s*Season.*/gi, "")
    .replace(/:\s*Season\s*\d+.*/gi, "")
    .replace(/\s*Season\s*\d+.*/gi, "")
    .replace(/\s*\d+(?:nd|rd|th|st)\s*Season.*/gi, "")
    .replace(/\s*Part\s*\d+.*/gi, "")
    .replace(/\s*Part\s*[IVXLCDM]+.*/gi, "")
    .replace(/\s*-\s*The\s*Movie.*/gi, "")
    .replace(/\s*\(TV\)/gi, "")
    .replace(/\s*\(Dub\)/gi, "")
    .replace(/\s*\(Sub\)/gi, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ScrapeSearchResult {
  title: string;
  slug: string;
  url: string;
  poster: string;
  provider?: SubIndoProvider;
}

export interface ScrapeEpisodeItem {
  title: string;
  episodeSlug: string;
  episodeNumber: number;
  url: string;
  date: string;
}

export interface ScrapeMirrorItem {
  id: string;
  name: string;
  quality: string;
  serverId: string;
  dataContent?: string;
  provider?: SubIndoProvider;
}

export interface ScrapeWatchData {
  success: boolean;
  baseUrl: string;
  episodeSlug: string;
  provider: SubIndoProvider;
  iframeUrl: string;
  defaultIframe: string;
  mirrors: ScrapeMirrorItem[];
  selectedServerName?: string;
  selectedQuality?: string;
  error?: string;
  status?: number;
  domain?: string;
}

/**
 * Scores the match between search result title and AniList anime metadata
 */
export function scoreMatch(
  searchResultTitle: string,
  anilistData: {
    title?: { romaji?: string; english?: string; userPreferred?: string };
    format?: string;
    episodes?: number | null;
  }
): number {
  const sTitle = searchResultTitle.toLowerCase();
  const aRomaji = (anilistData.title?.romaji || "").toLowerCase();
  const aEnglish = (anilistData.title?.english || "").toLowerCase();
  let score = 0;

  // Detect season in AniList
  let anilistSeason = 1;
  const sMatch =
    aRomaji.match(/season\s*(\d+)/i) ||
    aEnglish.match(/season\s*(\d+)/i) ||
    aRomaji.match(/(\d+)(?:nd|rd|th|st)\s*season/i) ||
    aEnglish.match(/(\d+)(?:nd|rd|th|st)\s*season/i);
  if (sMatch) anilistSeason = parseInt(sMatch[1], 10);

  const isFinalSeason =
    aRomaji.includes("final season") || aEnglish.includes("final season");
  const isPart2 =
    aRomaji.includes("part 2") ||
    aEnglish.includes("part 2") ||
    aRomaji.includes("part ii") ||
    aEnglish.includes("part ii");

  // Detect season in search result
  let resultSeason = 1;
  const resSMatch =
    sTitle.match(/season\s*(\d+)/i) ||
    sTitle.match(/\bs(\d+)\b/i) ||
    sTitle.match(/(\d+)(?:nd|rd|th|st)\s*season/i);
  if (resSMatch) resultSeason = parseInt(resSMatch[1], 10);

  const resIsFinal = sTitle.includes("final season");
  const resIsPart2 =
    sTitle.includes("part 2") || sTitle.includes("part ii");

  // Season matching
  if (isFinalSeason) {
    if (resIsFinal) score += 35;
    if (isPart2 === resIsPart2) score += 20;
    else score -= 15;
  } else if (anilistSeason > 1) {
    if (resultSeason === anilistSeason) score += 35;
    else score -= 30;
  } else {
    // Season 1
    if (resultSeason === 1 && !resIsFinal) score += 30;
    else score -= 35;
  }

  // Format penalty / reward
  const isMovie = anilistData.format === "MOVIE";
  if (!isMovie) {
    if (sTitle.includes("movie") || sTitle.includes("the movie")) score -= 40;
    if (sTitle.includes("ova")) score -= 40;
    if (sTitle.includes("kanketsu-hen")) score -= 25;
  } else {
    if (sTitle.includes("movie") || sTitle.includes("the movie")) score += 40;
  }

  // Episode count check
  if (anilistData.episodes && anilistData.episodes > 0) {
    const epMatch = sTitle.match(/episode\s*\d+\s*[–-]\s*(\d+)/i);
    if (epMatch) {
      const epCount = parseInt(epMatch[1], 10);
      if (Math.abs(epCount - anilistData.episodes) <= 2) score += 25;
    }
  }

  return score;
}

/**
 * Finds the best match from a list of search results based on AniList metadata
 */
export function findBestAnimeMatch(
  results: ScrapeSearchResult[],
  anilistData: {
    title?: { romaji?: string; english?: string; userPreferred?: string };
    format?: string;
    episodes?: number | null;
  }
): ScrapeSearchResult | null {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return results[0];

  let bestResult = results[0];
  let highestScore = -Infinity;

  for (const r of results) {
    const score = scoreMatch(r.title, anilistData);
    if (score > highestScore) {
      highestScore = score;
      bestResult = r;
    }
  }

  return bestResult;
}

/**
 * 1. Search anime on SankaVollereii API (Otakudesu or Samehadaku)
 */
export async function scrapeSearch(
  query: string,
  provider: SubIndoProvider | "all" = "all"
): Promise<{
  success: boolean;
  baseUrl: string;
  results: ScrapeSearchResult[];
  status?: number;
  error?: string;
  domain?: string;
}> {
  const baseUrl = getSankaBaseUrl();
  const cleaned = cleanAnimeTitle(query) || query.trim();
  const results: ScrapeSearchResult[] = [];

  try {
    // Attempt Otakudesu if requested
    if (provider === "otakudesu" || provider === "all") {
      try {
        const otakuSearchUrl = `${baseUrl}/anime/search/${encodeURIComponent(cleaned)}`;
        const res = await fetch(otakuSearchUrl, {
          headers: {
            "User-Agent": DEFAULT_USER_AGENT,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
          next: { revalidate: 3600 },
        });

        if (res.ok) {
          const data = await res.json();
          const animeList = data.data?.animeList || data.data || [];
          if (Array.isArray(animeList)) {
            animeList.forEach((item: any) => {
              results.push({
                title: item.title,
                slug: item.animeId || item.slug,
                url: item.href || item.otakudesuUrl || "",
                poster: item.poster || "",
                provider: "otakudesu",
              });
            });
          }
        }
      } catch (err) {
        console.warn("Otakudesu search error:", err);
      }
    }

    // Attempt Samehadaku if requested or if Otakudesu returned 0 results
    if (provider === "samehadaku" || (provider === "all" && results.length === 0)) {
      try {
        const sameSearchUrl = `${baseUrl}/anime/samehadaku/search?q=${encodeURIComponent(cleaned)}`;
        const sameRes = await fetch(sameSearchUrl, {
          headers: {
            "User-Agent": DEFAULT_USER_AGENT,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
          next: { revalidate: 3600 },
        });

        if (sameRes.ok) {
          const sameData = await sameRes.json();
          const sameList = sameData.data?.animeList || sameData.data || [];
          if (Array.isArray(sameList)) {
            sameList.forEach((item: any) => {
              results.push({
                title: item.title,
                slug: item.animeId || item.slug,
                url: item.href || item.samehadakuUrl || "",
                poster: item.poster || "",
                provider: "samehadaku",
              });
            });
          }
        }
      } catch (err) {
        console.warn("Samehadaku search error:", err);
      }
    }

    // Attempt Kuramanime if requested or if other providers returned 0 results
    if (provider === "kuramanime" || (provider === "all" && results.length === 0)) {
      try {
        const kuraSearchUrl = `${baseUrl}/anime/kura/search/${encodeURIComponent(cleaned)}`;
        const kuraRes = await fetch(kuraSearchUrl, {
          headers: {
            "User-Agent": DEFAULT_USER_AGENT,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
          next: { revalidate: 3600 },
        });

        if (kuraRes.ok) {
          const kuraData = await kuraRes.json();
          const kuraList = kuraData.data?.animeList || kuraData.data || [];
          if (Array.isArray(kuraList)) {
            kuraList.forEach((item: any) => {
              results.push({
                title: item.title,
                slug: item.animeId || item.slug || `${item.id || ""}/${item.slug || ""}`,
                url: item.href || item.url || "",
                poster: item.poster || item.image || "",
                provider: "kuramanime",
              });
            });
          }
        }
      } catch (err) {
        console.warn("Kuramanime search error:", err);
      }
    }

    return {
      success: true,
      baseUrl,
      results,
    };
  } catch (err: any) {
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    return {
      success: false,
      baseUrl,
      results: [],
      status: isTimeout ? 504 : 500,
      domain: baseUrl,
      error: isTimeout
        ? `Request ke SankaVollereii API (${baseUrl}) timeout setelah 10 detik`
        : `Gagal mencari anime: ${err.message || String(err)}`,
    };
  }
}

/**
 * 2. Get episode list from SankaVollereii API
 */
export async function scrapeEpisodes(
  slug: string,
  provider: SubIndoProvider = "otakudesu"
): Promise<{
  success: boolean;
  baseUrl: string;
  slug: string;
  episodes: ScrapeEpisodeItem[];
  status?: number;
  error?: string;
  domain?: string;
}> {
  const baseUrl = getSankaBaseUrl();
  const cleanSlug = slug.replace(/^\/+|\/+$/g, "");

  let endpoint = `${baseUrl}/anime/anime/${encodeURIComponent(cleanSlug)}`;
  if (provider === "samehadaku") {
    endpoint = `${baseUrl}/anime/samehadaku/anime/${encodeURIComponent(cleanSlug)}`;
  } else if (provider === "kuramanime") {
    endpoint = `${baseUrl}/anime/kura/anime/${cleanSlug}`;
  }

  try {
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        success: false,
        baseUrl,
        slug: cleanSlug,
        episodes: [],
        status: res.status,
        domain: baseUrl,
        error: errJson?.message || `SankaVollereii API mengembalikan status HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    const rawList = json.data?.episodeList || json.data?.episodes || [];

    const episodeMap = new Map<number, ScrapeEpisodeItem>();

    rawList.forEach((ep: any, index: number) => {
      const epSlug = String(ep.episodeId || ep.slug || "").trim();
      const title = String(ep.title || "").trim();

      // Ignore divider items, batch posts, previews
      if (
        !epSlug ||
        /pembatas|batch|trailer|preview/i.test(epSlug) ||
        /pembatas|batch|trailer|preview/i.test(title)
      ) {
        return;
      }

      // Check slug cross-anime contamination (e.g. One Piece)
      const cleanLower = cleanSlug.toLowerCase();
      const slugLower = epSlug.toLowerCase();
      if (cleanLower.includes("1piece") || cleanLower.includes("onepiece")) {
        if (!slugLower.includes("piece") && !slugLower.includes("wpoiec")) {
          return;
        }
      }

      // Parse episode number
      let epNumber: number | null = null;
      if (typeof ep.eps === "number" && ep.eps > 0) {
        epNumber = ep.eps;
      } else if (typeof ep.title === "number" && ep.title > 0) {
        epNumber = ep.title;
      } else {
        const epMatch =
          title.match(/(?:Episode|Eps\.?)\s*(\d+)/i) ||
          title.match(/^(\d+)$/) ||
          epSlug.match(/episode-(\d+)/i);
        if (epMatch) {
          epNumber = parseInt(epMatch[1], 10);
        }
      }

      if (epNumber === null || isNaN(epNumber) || epNumber <= 0) return;

      const item: ScrapeEpisodeItem = {
        title: title || `Episode ${epNumber}`,
        episodeSlug: epSlug,
        episodeNumber: epNumber,
        url: ep.href || ep.otakudesuUrl || ep.samehadakuUrl || "",
        date: ep.date || "",
      };

      if (!episodeMap.has(epNumber)) {
        episodeMap.set(epNumber, item);
      } else {
        const existing = episodeMap.get(epNumber)!;
        if (typeof ep.eps === "number" && ep.eps > 0) {
          episodeMap.set(epNumber, item);
        }
      }
    });

    const episodes = Array.from(episodeMap.values());
    // Sort chronologically ascending (1, 2, 3...)
    episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

    return {
      success: true,
      baseUrl,
      slug: cleanSlug,
      episodes,
    };
  } catch (err: any) {
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    return {
      success: false,
      baseUrl,
      slug: cleanSlug,
      episodes: [],
      status: isTimeout ? 504 : 500,
      domain: baseUrl,
      error: isTimeout
        ? `Request episode ke SankaVollereii timeout setelah 10 detik`
        : `Gagal mengambil daftar episode: ${err.message || String(err)}`,
    };
  }
}

/**
 * 3. Get episode stream & server mirrors (/anime/episode/:slug or /anime/samehadaku/episode/:slug)
 *
 * For Otakudesu:
 * - Checks defaultStreamingUrl (Desustream/Odstream).
 * - Filters mirrors strictly for Vidhide and Mega (removes non-functioning ones).
 *
 * For Samehadaku:
 * - Checks defaultStreamingUrl (Wibufile/Blogger).
 * - Extracts working mirrors (Wibufile, Mega, Blogger, etc.).
 */
export async function scrapeWatch(
  episodeSlug: string,
  serverId?: string,
  provider: SubIndoProvider = "otakudesu"
): Promise<ScrapeWatchData> {
  const baseUrl = getSankaBaseUrl();
  const cleanEpSlug = episodeSlug.replace(/^\/+|\/+$/g, "");

  let endpoint = `${baseUrl}/anime/episode/${encodeURIComponent(cleanEpSlug)}`;
  if (provider === "samehadaku") {
    endpoint = `${baseUrl}/anime/samehadaku/episode/${encodeURIComponent(cleanEpSlug)}`;
  } else if (provider === "kuramanime") {
    endpoint = `${baseUrl}/anime/kura/watch/${cleanEpSlug}`;
  }

  try {
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const isMaint = res.status === 503 || errJson?.message?.includes("dinonaktifkan");
      return {
        success: false,
        baseUrl,
        episodeSlug: cleanEpSlug,
        provider,
        iframeUrl: "",
        defaultIframe: "",
        mirrors: [],
        status: res.status,
        domain: provider === "kuramanime" ? "Kuramanime" : baseUrl,
        error: isMaint
          ? "Layanan server Kuramanime sedang dalam pemeliharaan upstream oleh SankaVollereii. Anda dapat beralih ke Otakudesu atau Samehadaku."
          : (errJson?.message || `SankaVollereii API mengembalikan status HTTP ${res.status}`),
      };
    }

    const json = await res.json();
    const data = json.data;

    if (!data) {
      return {
        success: false,
        baseUrl,
        episodeSlug: cleanEpSlug,
        provider,
        iframeUrl: "",
        defaultIframe: "",
        mirrors: [],
        status: 404,
        domain: baseUrl,
        error: "Data episode tidak ditemukan pada server SankaVollereii",
      };
    }

    const rawMirrors: ScrapeMirrorItem[] = [];
    let defaultStream = "";

    // 1. Check defaultStreamingUrl
    if (
      data.defaultStreamingUrl &&
      typeof data.defaultStreamingUrl === "string" &&
      !data.defaultStreamingUrl.includes("maintenance")
    ) {
      let defUrl = data.defaultStreamingUrl.trim();
      if (defUrl.startsWith("//")) defUrl = "https:" + defUrl;
      defaultStream = defUrl;

      const defName =
        provider === "samehadaku"
          ? "Default Stream"
          : provider === "kuramanime"
            ? "Kuramadrive (Default)"
            : "Desustream (Default)";

      rawMirrors.push({
        id: "default-stream",
        name: defName,
        quality: "HD / Auto",
        serverId: "",
        dataContent: defUrl,
        provider,
      });
    }

    // 2. Extract qualities and server list
    const qualities = data.server?.qualities || [];

    if (Array.isArray(qualities)) {
      qualities.forEach((q: any) => {
        let qualityName = (q.title || "Default").trim();
        if (qualityName.toLowerCase() === "unknown") qualityName = "Auto";
        const serverList = q.serverList || [];

        serverList.forEach((s: any) => {
          if (!s.serverId || !s.title) return;

          if (provider === "otakudesu") {
            // Strict filter for Vidhide and Mega only on Otakudesu
            if (isVidhideOrMega(s.title)) {
              rawMirrors.push({
                id: s.serverId,
                name: formatServerName(s.title),
                quality: qualityName,
                serverId: s.serverId,
                dataContent: s.serverId,
                provider: "otakudesu",
              });
            }
          } else {
            // Samehadaku & Kuramanime mirrors
            rawMirrors.push({
              id: s.serverId,
              name: formatServerName(s.title),
              quality: qualityName,
              serverId: s.serverId,
              dataContent: s.serverId,
              provider,
            });
          }
        });
      });
    }

    // Sort mirrors by resolution descending (1080p > 720p > 480p > 360p)
    const getRes = (q: string): number => {
      const m = q.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    };

    rawMirrors.sort((a, b) => {
      // Keep default stream at top if present
      if (a.id === "default-stream") return -1;
      if (b.id === "default-stream") return 1;

      const diff = getRes(b.quality) - getRes(a.quality);
      if (diff !== 0) return diff;

      // Prefer Vidhide over Mega in Otakudesu
      const aIsVid = a.name.toLowerCase().includes("vidhide");
      const bIsVid = b.name.toLowerCase().includes("vidhide");
      if (aIsVid && !bIsVid) return -1;
      if (!aIsVid && bIsVid) return 1;

      return 0;
    });

    if (rawMirrors.length === 0) {
      return {
        success: false,
        baseUrl,
        episodeSlug: cleanEpSlug,
        provider,
        iframeUrl: "",
        defaultIframe: "",
        mirrors: [],
        status: 404,
        domain: baseUrl,
        error: `Server untuk provider ${provider} belum tersedia untuk episode ini.`,
      };
    }

    // Determine target mirror
    let targetMirror = rawMirrors[0];
    if (serverId && serverId.trim()) {
      const matched = rawMirrors.find((m) => m.serverId === serverId || m.id === serverId);
      if (matched) {
        targetMirror = matched;
      }
    }

    // If target mirror has static dataContent and no serverId (e.g. default-stream)
    let resolvedIframe = "";
    if (targetMirror.dataContent && !targetMirror.serverId) {
      resolvedIframe = targetMirror.dataContent;
    } else if (targetMirror.serverId) {
      resolvedIframe = (await resolveServerMirror(targetMirror.serverId, provider)) || "";
    }

    // Fallback: If primary mirror resolution failed, try alternative mirrors
    if (!resolvedIframe) {
      for (const alt of rawMirrors) {
        if (alt.id !== targetMirror.id) {
          if (alt.dataContent && !alt.serverId) {
            resolvedIframe = alt.dataContent;
            targetMirror = alt;
            break;
          } else if (alt.serverId) {
            const altUrl = await resolveServerMirror(alt.serverId, provider);
            if (altUrl) {
              resolvedIframe = altUrl;
              targetMirror = alt;
              break;
            }
          }
        }
      }
    }

    if (!resolvedIframe) {
      return {
        success: false,
        baseUrl,
        episodeSlug: cleanEpSlug,
        provider,
        iframeUrl: "",
        defaultIframe: "",
        mirrors: rawMirrors,
        status: 502,
        domain: baseUrl,
        error: `Gagal memuat stream dari server ${provider}.`,
      };
    }

    return {
      success: true,
      baseUrl,
      episodeSlug: cleanEpSlug,
      provider,
      iframeUrl: resolvedIframe,
      defaultIframe: defaultStream || resolvedIframe,
      mirrors: rawMirrors,
      selectedServerName: targetMirror.name,
      selectedQuality: targetMirror.quality,
    };
  } catch (err: any) {
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    return {
      success: false,
      baseUrl,
      episodeSlug: cleanEpSlug,
      provider,
      iframeUrl: "",
      defaultIframe: "",
      mirrors: [],
      status: isTimeout ? 504 : 500,
      domain: baseUrl,
      error: isTimeout
        ? `Request stream ke SankaVollereii timeout setelah 10 detik`
        : `Gagal memuat stream video: ${err.message || String(err)}`,
    };
  }
}

/**
 * 4. Resolve server mirror embed URL (/anime/server/:serverId or /anime/samehadaku/server/:serverId)
 */
export async function resolveServerMirror(
  serverId: string,
  provider: SubIndoProvider = "otakudesu"
): Promise<string | null> {
  const baseUrl = getSankaBaseUrl();
  let endpoint = `${baseUrl}/anime/server/${encodeURIComponent(serverId)}`;
  if (provider === "samehadaku") {
    endpoint = `${baseUrl}/anime/samehadaku/server/${encodeURIComponent(serverId)}`;
  } else if (provider === "kuramanime") {
    endpoint = `${baseUrl}/anime/kura/server/${encodeURIComponent(serverId)}`;
  }

  try {
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    let url = json.data?.url || "";

    if (url.startsWith("//")) {
      url = "https:" + url;
    }
    return url || null;
  } catch (err) {
    console.error(`Error resolving mirror server from SankaVollereii (${provider}):`, err);
    return null;
  }
}

/**
 * 5. Helper: Find matching Samehadaku episode slug for an anime and episode number
 */
/**
 * Helper to resolve Samehadaku episode slug for a series & episode number.
 * Uses direct canonical slug prediction first (e.g. one-piece-episode-11), then search fallback.
 */
export async function findSamehadakuEpisodeSlug(
  title: string,
  episodeNumber: number
): Promise<string | null> {
  const baseUrl = getSankaBaseUrl();
  // Ensure title is human-readable, not a raw slug or "Anime blk-clver-s2..."
  const humanTitle = slugToHumanTitle(title);
  const cleanTitle = cleanAnimeTitle(humanTitle);
  if (!cleanTitle) return null;

  const epRegex = new RegExp(`(?:episode|eps|-)\\s*0*${episodeNumber}(?:[^-0-9]|$)`, "i");

  // Step 1 (Fastest & most accurate): Search Samehadaku for clean title (e.g. "Black Clover Season 2")
  try {
    const res = await fetch(`${baseUrl}/anime/samehadaku/search?q=${encodeURIComponent(cleanTitle)}`, {
      headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      const list: any[] = data.data?.animeList || [];

      // Check if any search result is directly this episode
      const direct = list.find(
        (item) => (epRegex.test(item.title || "") || epRegex.test(item.animeId || "")) && !item.title?.toLowerCase().includes("batch")
      );
      if (direct?.animeId) return direct.animeId;

      // Check series candidate
      const seriesCandidates = list.filter(
        (item) => !item.title?.toLowerCase().includes("batch") && !item.title?.toLowerCase().includes("episode")
      );
      const bestSeries = seriesCandidates[0] || list[0];

      if (bestSeries?.animeId) {
        const detailRes = await fetch(`${baseUrl}/anime/samehadaku/anime/${encodeURIComponent(bestSeries.animeId)}`, {
          headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "application/json" },
          signal: AbortSignal.timeout(4500),
        });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const epList: any[] = detailData.data?.episodeList || [];
          const matchedEp = epList.find((ep) => {
            if (typeof ep.title === "number" && ep.title === episodeNumber) return true;
            const t = String(ep.title || "");
            const id = String(ep.episodeId || "");
            return epRegex.test(t) || epRegex.test(id);
          });
          if (matchedEp?.episodeId) return matchedEp.episodeId;
        }
      }
    }
  } catch (e) {
    console.warn("Samehadaku search failed:", e);
  }

  // Step 2: Canonical slug prediction fallback (tight 3s timeout)
  const baseCandidates = new Set<string>();
  const base1 = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base1) baseCandidates.add(base1);

  const baseNoYear = base1.replace(/-\d{4}$/, "").replace(/-\d{4}-/g, "-");
  if (baseNoYear) baseCandidates.add(baseNoYear);

  for (const baseSlug of Array.from(baseCandidates).slice(0, 2)) {
    const candidate = `${baseSlug}-episode-${episodeNumber}`;
    try {
      const testRes = await fetch(
        `${baseUrl}/anime/samehadaku/episode/${encodeURIComponent(candidate)}`,
        {
          headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (testRes.ok) {
        return candidate;
      }
    } catch {}
  }

  return null;
}

/**
 * 6. Helper: Find matching Otakudesu episode slug for an anime and episode number
 */
export async function findOtakudesuEpisodeSlug(
  title: string,
  episodeNumber: number
): Promise<string | null> {
  const baseUrl = getSankaBaseUrl();
  const cleanTitle = cleanAnimeTitle(title);
  if (!cleanTitle) return null;

  try {
    const res = await fetch(`${baseUrl}/anime/search/${encodeURIComponent(cleanTitle)}`, {
      headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const list: any[] = json.data?.animeList || [];
    if (!list.length) return null;

    // Use findBestAnimeMatch to prioritize exact season match over sequel/prequel
    const matchedAnime =
      findBestAnimeMatch(
        list.map((item) => ({
          title: item.title,
          slug: item.animeId,
          url: item.href || "",
          poster: item.poster || "",
          provider: "otakudesu" as const,
        })),
        { title: { romaji: title, english: title, userPreferred: title } }
      ) || list[0];

    if (!matchedAnime?.slug) return null;

    const detailRes = await fetch(
      `${baseUrl}/anime/anime/${encodeURIComponent(matchedAnime.slug)}`,
      {
        headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!detailRes.ok) return null;
    const detailJson = await detailRes.json();
    const epList: any[] = detailJson.data?.episodeList || [];

    const epRegex = new RegExp(`(?:episode|eps|-)\\s*0*${episodeNumber}(?:[^-0-9]|$)`, "i");
    const matchedEp = epList.find((ep) => {
      if (typeof ep.eps === "number" && ep.eps === episodeNumber) return true;
      const t = String(ep.title || "");
      const id = String(ep.episodeId || "");
      return epRegex.test(t) || epRegex.test(id);
    });

    return matchedEp?.episodeId || null;
  } catch (e) {
    console.warn("Otakudesu episode resolution failed:", e);
    return null;
  }
}

/**
 * 7. Helper: Find Kuramanime stream directly by animeTitle and episodeNumber
 */
export async function findKuramanimeEpisodeStream(
  title: string,
  episodeNumber: number
): Promise<ScrapeWatchData> {
  const baseUrl = getSankaBaseUrl();
  const humanTitle = slugToHumanTitle(title);
  const cleanTitle = cleanAnimeTitle(humanTitle);
  if (!cleanTitle) {
    return {
      success: false,
      baseUrl,
      episodeSlug: "",
      provider: "kuramanime",
      iframeUrl: "",
      defaultIframe: "",
      mirrors: [],
      status: 400,
      error: "Judul anime tidak valid untuk pencarian Kuramanime",
    };
  }

  try {
    // Step 1: Search Kuramanime via SankaVollereii (fast 5s timeout)
    const searchRes = await fetch(
      `${baseUrl}/anime/kura/search/${encodeURIComponent(cleanTitle)}`,
      {
        headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!searchRes.ok) {
      const errJson = await searchRes.json().catch(() => null);
      const isMaint =
        searchRes.status === 503 || errJson?.message?.includes("dinonaktifkan");
      return {
        success: false,
        baseUrl,
        episodeSlug: "",
        provider: "kuramanime",
        iframeUrl: "",
        defaultIframe: "",
        mirrors: [],
        status: searchRes.status,
        domain: "Kuramanime",
        error: isMaint
          ? "Layanan server Kuramanime sedang dalam pemeliharaan upstream oleh SankaVollereii. Anda dapat beralih ke Otakudesu atau Samehadaku."
          : (errJson?.message || `Kuramanime API mengembalikan status HTTP ${searchRes.status}`),
      };
    }

    const searchJson = await searchRes.json();
    const animeList: any[] = searchJson.data?.animeList || searchJson.data || [];

    if (!Array.isArray(animeList) || animeList.length === 0) {
      return {
        success: false,
        baseUrl,
        episodeSlug: "",
        provider: "kuramanime",
        iframeUrl: "",
        defaultIframe: "",
        mirrors: [],
        status: 404,
        domain: "Kuramanime",
        error: `Anime "${title}" tidak ditemukan di database Kuramanime.`,
      };
    }

    // Step 2: Match best anime
    const bestMatch =
      findBestAnimeMatch(
        animeList.map((item) => ({
          title: item.title,
          slug: item.animeId || item.slug || `${item.id || ""}/${item.slug || ""}`,
          url: item.href || item.url || "",
          poster: item.poster || item.image || "",
          provider: "kuramanime" as const,
        })),
        { title: { romaji: title, english: title, userPreferred: title } }
      ) || animeList[0];

    let kuraId = "";
    let kuraSlug = "";
    if (bestMatch?.slug) {
      const parts = String(bestMatch.slug).split("/").filter(Boolean);
      if (parts.length >= 2) {
        kuraId = parts[0];
        kuraSlug = parts[1];
      } else if (parts.length === 1) {
        kuraSlug = parts[0];
      }
    }

    if (!kuraId || !kuraSlug) {
      const raw = animeList.find((a) => a.title === bestMatch?.title) || animeList[0];
      kuraId = String(raw.id || raw.animeId || "").split("/")[0];
      kuraSlug = String(raw.slug || raw.animeId || "").split("/").pop() || "";
    }

    if (!kuraId || !kuraSlug) {
      return {
        success: false,
        baseUrl,
        episodeSlug: "",
        provider: "kuramanime",
        iframeUrl: "",
        defaultIframe: "",
        mirrors: [],
        status: 404,
        domain: "Kuramanime",
        error: `Parameter ID atau slug Kuramanime untuk "${title}" tidak valid.`,
      };
    }

    // Step 3: Fetch watch endpoint
    const watchEndpoint = `${baseUrl}/anime/kura/watch/${encodeURIComponent(kuraId)}/${encodeURIComponent(kuraSlug)}/${episodeNumber}`;
    const watchRes = await fetch(watchEndpoint, {
      headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!watchRes.ok) {
      const wErr = await watchRes.json().catch(() => null);
      const isMaint = watchRes.status === 503 || wErr?.message?.includes("dinonaktifkan");
      return {
        success: false,
        baseUrl,
        episodeSlug: `${kuraId}/${kuraSlug}/${episodeNumber}`,
        provider: "kuramanime",
        iframeUrl: "",
        defaultIframe: "",
        mirrors: [],
        status: watchRes.status,
        domain: "Kuramanime",
        error: isMaint
          ? "Layanan server Kuramanime sedang dalam pemeliharaan upstream oleh SankaVollereii. Anda dapat beralih ke Otakudesu atau Samehadaku."
          : (wErr?.message || `Episode ${episodeNumber} belum tersedia di Kuramanime.`),
      };
    }

    const watchData = await watchRes.json();
    const data = watchData.data || watchData;

    const mirrors: ScrapeMirrorItem[] = [];
    let iframeUrl = data.defaultStreamingUrl || data.streamUrl || data.iframeUrl || "";

    if (iframeUrl) {
      mirrors.push({
        id: "default-stream",
        name: "Kuramadrive (Default)",
        quality: "HD / Auto",
        serverId: "",
        dataContent: iframeUrl,
        provider: "kuramanime",
      });
    }

    if (Array.isArray(data.serverList || data.servers)) {
      (data.serverList || data.servers).forEach((s: any, idx: number) => {
        mirrors.push({
          id: s.serverId || `kura-${idx}`,
          name: formatServerName(s.title || s.name || "Kuramadrive"),
          quality: s.quality || "HD",
          serverId: s.serverId || "",
          dataContent: s.url || s.link || "",
          provider: "kuramanime",
        });
      });
    }

    if (!iframeUrl && mirrors.length > 0) {
      iframeUrl = mirrors[0].dataContent || "";
    }

    return {
      success: Boolean(iframeUrl || mirrors.length > 0),
      baseUrl,
      episodeSlug: `${kuraId}/${kuraSlug}/${episodeNumber}`,
      provider: "kuramanime",
      iframeUrl,
      defaultIframe: iframeUrl,
      mirrors,
      status: 200,
    };
  } catch (err: any) {
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    return {
      success: false,
      baseUrl,
      episodeSlug: "",
      provider: "kuramanime",
      iframeUrl: "",
      defaultIframe: "",
      mirrors: [],
      status: isTimeout ? 504 : 500,
      domain: "Kuramanime",
      error: isTimeout
        ? "Request ke server Kuramanime timeout setelah 10 detik."
        : `Gagal memuat Kuramanime: ${err.message || String(err)}`,
    };
  }
}
