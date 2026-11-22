import { AnimeItem, ScheduleItem, StreamEpisodeItem } from "@/types";
import { getSankaBaseUrl, DEFAULT_USER_AGENT, cleanAnimeTitle } from "@/lib/scraper";

export interface PaginatedAnimeResult {
  animeList: AnimeItem[];
  pagination: {
    currentPage: number;
    hasNextPage: boolean;
    totalPages: number;
  };
}

/**
 * Maps raw Sanka anime item to Yoru's AnimeItem format
 */
export function mapSankaToAnimeItem(item: any): AnimeItem {
  const slug = String(item.animeId || item.slug || "").trim();
  const rawTitle = String(item.title || "Anime").trim();

  // Clean trailing Indonesian sub indicators while preserving season/episode/movie info
  const cleanTitle = rawTitle
    .replace(/\s*Subtitle\s+Indonesia/gi, "")
    .replace(/\s*Sub\s+Indo/gi, "")
    .trim() || rawTitle;

  const poster = String(item.poster || "").trim();

  let epCount: number | null = null;
  if (typeof item.episodes === "number") {
    epCount = item.episodes;
  } else if (typeof item.eps === "number") {
    epCount = item.eps;
  } else if (item.episodes) {
    const parsed = parseInt(String(item.episodes), 10);
    if (!isNaN(parsed)) epCount = parsed;
  }

  // Real score extraction - keep null if not provided, DO NOT default to 80 / 8.0!
  let score: number | null = null;
  if (item.score !== undefined && item.score !== null && item.score !== "") {
    const parsed = parseFloat(String(item.score).replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed) && parsed > 0) {
      score = Math.round(parsed * 10);
    }
  }

  const genres = Array.isArray(item.genreList)
    ? item.genreList.map((g: any) => g.title || g).filter(Boolean)
    : [];

  return {
    id: slug,
    slug,
    title: {
      romaji: cleanTitle,
      english: cleanTitle,
      userPreferred: cleanTitle,
    },
    coverImage: {
      extraLarge: poster,
      large: poster,
      medium: poster,
    },
    bannerImage: poster,
    format: item.type || (rawTitle.toLowerCase().includes("movie") ? "MOVIE" : "TV"),
    status:
      item.status === "Completed" || item.lastReleaseDate
        ? "FINISHED"
        : "RELEASING",
    episodes: epCount,
    duration: 24,
    averageScore: score, // nullable: null if no rating exists
    genres,
    description: item.synopsis?.paragraphs?.join("\n\n") || (typeof item.synopsis === "string" ? item.synopsis : ""),
    releaseDay: item.releaseDay || "",
    latestReleaseDate: item.latestReleaseDate || item.lastReleaseDate || "",
  };
}

/**
 * Robust episode sanitizer and deduplicator.
 * Rejects dividers, batch posts, previews, and episodes belonging to other anime.
 */
export function sanitizeAndDeduplicateEpisodes(
  rawEpisodes: any[],
  animeTitle?: string,
  animeSlug?: string
): StreamEpisodeItem[] {
  if (!Array.isArray(rawEpisodes)) return [];

  const episodeMap = new Map<number, StreamEpisodeItem>();

  for (let idx = 0; idx < rawEpisodes.length; idx++) {
    const ep = rawEpisodes[idx];
    if (!ep) continue;

    const epSlug = String(ep.episodeId || ep.slug || "").trim();
    const rawEpTitle = String(ep.title || "").trim();

    // 1. Strict filter: reject dividers, batch posts, previews, and empty slugs
    if (
      !epSlug ||
      /pembatas|batch|trailer|preview/i.test(epSlug) ||
      /pembatas|batch|trailer|preview/i.test(rawEpTitle)
    ) {
      continue;
    }

    // 2. Reject episodes clearly belonging to another anime
    if (animeSlug) {
      const cleanAnimeSlug = animeSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanEpSlug = epSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanEpTitle = rawEpTitle.toLowerCase();

      // Special check for One Piece: reject any non-piece/wpoiec episode (such as zombie-saga)
      if (cleanAnimeSlug.includes("1piece") || cleanAnimeSlug.includes("onepiece")) {
        if (
          !cleanEpSlug.includes("piece") &&
          !cleanEpSlug.includes("wpoiec") &&
          !cleanEpTitle.includes("one piece")
        ) {
          continue;
        }
      }

      // If episode title starts with # (common for #Zombie Sagashitemasu) and current anime is not that
      if (cleanEpTitle.startsWith("#") && !cleanAnimeSlug.includes("zombie")) {
        continue;
      }
    }

    // 3. Determine episode number
    let epNumber: number | null = null;
    if (typeof ep.eps === "number" && ep.eps > 0) {
      epNumber = ep.eps;
    } else if (typeof ep.title === "number" && ep.title > 0) {
      epNumber = ep.title;
    } else {
      // Avoid matching ranges like "1 - 900"
      if (/[-–—]\s*\d+/.test(rawEpTitle) && !/episode/i.test(rawEpTitle)) {
        continue;
      }

      const match =
        rawEpTitle.match(/(?:Episode|Eps\.?)\s*(\d+)/i) ||
        epSlug.match(/episode-(\d+)/i) ||
        rawEpTitle.match(/^(\d+)$/);

      if (match) {
        epNumber = parseInt(match[1], 10);
      }
    }

    if (epNumber === null || isNaN(epNumber) || epNumber <= 0) {
      continue;
    }

    const item: StreamEpisodeItem = {
      id: epSlug,
      number: epNumber,
      title: rawEpTitle || `Episode ${epNumber}`,
      episodeSlug: epSlug,
      date: String(ep.date || ""),
    };

    // 4. Deduplicate: if an episode with this number exists, pick the better match
    if (episodeMap.has(epNumber)) {
      const existing = episodeMap.get(epNumber)!;
      // Prefer item with explicit `eps` or matching slug prefix
      const hasExplicitEps = typeof ep.eps === "number" && ep.eps > 0;
      if (hasExplicitEps) {
        episodeMap.set(epNumber, item);
      }
    } else {
      episodeMap.set(epNumber, item);
    }
  }

  const result = Array.from(episodeMap.values());
  // Sort strictly ascending by episode number (1, 2, 3...)
  result.sort((a, b) => a.number - b.number);
  return result;
}

/**
 * Maps raw Sanka anime detail response to Yoru's AnimeItem format
 */
export function mapSankaDetailToAnimeItem(slug: string, data: any): AnimeItem {
  const rawTitle = String(data.title || slug).trim();
  const cleanTitle = rawTitle
    .replace(/\s*Subtitle\s+Indonesia/gi, "")
    .replace(/\s*Sub\s+Indo/gi, "")
    .trim() || rawTitle;

  const poster = String(data.poster || "").trim();
  const paragraphs = data.synopsis?.paragraphs || [];
  const description = Array.isArray(paragraphs)
    ? paragraphs.join("\n\n")
    : String(data.synopsis || "");

  const genres = Array.isArray(data.genreList)
    ? data.genreList.map((g: any) => g.title).filter(Boolean)
    : [];

  const rawEpisodes = data.episodeList || data.episodes || [];
  const episodes = sanitizeAndDeduplicateEpisodes(rawEpisodes, cleanTitle, slug);

  let score: number | null = null;
  if (data.score) {
    const parsed = parseFloat(String(data.score).replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed) && parsed > 0) score = Math.round(parsed * 10);
  }

  const durationMatch = String(data.duration || "").match(/(\d+)/);
  const duration = durationMatch ? parseInt(durationMatch[1], 10) : 24;

  return {
    id: slug,
    slug,
    title: {
      romaji: cleanTitle,
      english: cleanTitle,
      native: data.japanese || "",
      userPreferred: cleanTitle,
    },
    coverImage: {
      extraLarge: poster,
      large: poster,
      medium: poster,
    },
    bannerImage: poster,
    format: data.type || (rawTitle.toLowerCase().includes("movie") ? "MOVIE" : "TV"),
    status: data.status === "Ongoing" ? "RELEASING" : "FINISHED",
    episodes: episodes.length || (typeof data.episodes === "number" ? data.episodes : 12),
    duration,
    averageScore: score,
    studios: {
      nodes: [{ name: data.studios || "Studio", isAnimationStudio: true }],
    },
    genres,
    description,
    episodeList: episodes,
  };
}

/**
 * 1. Get Trending / Ongoing Anime for Home
 */
export async function getTrendingAnime(
  page = 1,
  perPage = 12
): Promise<AnimeItem[]> {
  return getOngoingAnime(page, perPage);
}

/**
 * 2. Get Ongoing Anime from SankaVollereii
 */
export async function getOngoingAnime(
  page = 1,
  perPage = 12
): Promise<AnimeItem[]> {
  const baseUrl = getSankaBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/anime/ongoing-anime?page=${page}`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const json = await res.json();
      const list = json.data?.animeList || json.data?.ongoing?.animeList || [];
      if (Array.isArray(list) && list.length > 0) {
        return list.slice(0, perPage).map(mapSankaToAnimeItem);
      }
    }
  } catch (err) {
    console.warn("Error fetching ongoing anime from Sanka:", err);
  }
  return [];
}

/**
 * 3. Get Paginated Ongoing Anime List
 */
export async function getOngoingAnimeList(
  page = 1
): Promise<PaginatedAnimeResult> {
  const baseUrl = getSankaBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/anime/ongoing-anime?page=${page}`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const json = await res.json();
      const list = json.data?.animeList || [];
      const pagination = json.pagination || json.data?.pagination || {
        currentPage: page,
        hasNextPage: false,
        totalPages: 1,
      };

      return {
        animeList: Array.isArray(list) ? list.map(mapSankaToAnimeItem) : [],
        pagination: {
          currentPage: Number(pagination.currentPage) || page,
          hasNextPage: Boolean(pagination.hasNextPage),
          totalPages: Number(pagination.totalPages) || 1,
        },
      };
    }
  } catch (err) {
    console.warn("Error fetching ongoing anime list:", err);
  }

  return {
    animeList: [],
    pagination: { currentPage: page, hasNextPage: false, totalPages: 1 },
  };
}

/**
 * 4. Get Paginated Completed Anime List
 */
export async function getCompletedAnimeList(
  page = 1
): Promise<PaginatedAnimeResult> {
  const baseUrl = getSankaBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/anime/complete-anime?page=${page}`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const json = await res.json();
      const list = json.data?.animeList || [];
      const pagination = json.pagination || json.data?.pagination || {
        currentPage: page,
        hasNextPage: false,
        totalPages: 1,
      };

      return {
        animeList: Array.isArray(list) ? list.map(mapSankaToAnimeItem) : [],
        pagination: {
          currentPage: Number(pagination.currentPage) || page,
          hasNextPage: Boolean(pagination.hasNextPage),
          totalPages: Number(pagination.totalPages) || 1,
        },
      };
    }
  } catch (err) {
    console.warn("Error fetching completed anime list:", err);
  }

  return {
    animeList: [],
    pagination: { currentPage: page, hasNextPage: false, totalPages: 1 },
  };
}

/**
 * 5. Get Paginated Anime by Genre from SankaVollereii
 */
export async function getAnimeByGenre(
  genreSlug: string,
  page = 1
): Promise<PaginatedAnimeResult> {
  const baseUrl = getSankaBaseUrl();
  const cleanSlug = genreSlug.toLowerCase().trim().replace(/\s+/g, "-");

  try {
    const res = await fetch(`${baseUrl}/anime/genre/${encodeURIComponent(cleanSlug)}?page=${page}`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const json = await res.json();
      const list = json.data?.animeList || [];
      const pagination = json.pagination || json.data?.pagination || {
        currentPage: page,
        hasNextPage: false,
        totalPages: 1,
      };

      return {
        animeList: Array.isArray(list) ? list.map(mapSankaToAnimeItem) : [],
        pagination: {
          currentPage: Number(pagination.currentPage) || page,
          hasNextPage: Boolean(pagination.hasNextPage),
          totalPages: Number(pagination.totalPages) || 1,
        },
      };
    }
  } catch (err) {
    console.warn(`Error fetching genre ${genreSlug} anime from Sanka:`, err);
  }

  return {
    animeList: [],
    pagination: { currentPage: page, hasNextPage: false, totalPages: 1 },
  };
}

/**
 * 6. Get Top Rated / Completed Anime for Home
 */
export async function getTopRatedAnime(
  page = 1,
  perPage = 12
): Promise<AnimeItem[]> {
  const baseUrl = getSankaBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/anime/complete-anime?page=${page}`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const json = await res.json();
      const list = json.data?.animeList || [];
      if (Array.isArray(list) && list.length > 0) {
        return list.slice(0, perPage).map(mapSankaToAnimeItem);
      }
    }
  } catch (err) {
    console.warn("Error fetching completed anime from Sanka:", err);
  }
  return [];
}

/**
 * 7. Get Movie / Special Anime from SankaVollereii
 */
export async function getMovieAnime(
  page = 1,
  perPage = 12
): Promise<AnimeItem[]> {
  const baseUrl = getSankaBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/anime/search/movie`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const json = await res.json();
      const list = json.data?.animeList || [];
      if (Array.isArray(list) && list.length > 0) {
        return list.slice(0, perPage).map(mapSankaToAnimeItem);
      }
    }
  } catch (err) {
    console.warn("Error fetching movie anime from Sanka:", err);
  }
  return [];
}

/**
 * 8. Get Anime Details by SankaVollereii slug
 */
export async function getAnimeDetails(
  id: number | string
): Promise<AnimeItem | null> {
  const cleanSlug = String(id).replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return null;

  // On client side, route through internal API proxy to prevent CORS & unsafe header errors
  if (typeof window !== "undefined") {
    try {
      const clientRes = await fetch(`/api/anime/details?slug=${encodeURIComponent(cleanSlug)}`);
      if (clientRes.ok) {
        const clientJson = await clientRes.json();
        if (clientJson.success && clientJson.data) {
          return clientJson.data;
        }
      }
    } catch (err) {
      console.warn(`Client fetch anime details error for "${cleanSlug}":`, err);
    }
    return null;
  }

  const baseUrl = getSankaBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/anime/anime/${encodeURIComponent(cleanSlug)}`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.title) {
        return mapSankaDetailToAnimeItem(cleanSlug, json.data);
      }
    }
  } catch (err) {
    console.warn(`Error fetching anime details for slug "${cleanSlug}":`, err);
  }

  // Graceful fallback: 1x search fallback using cleaned slug/title before giving up
  try {
    const searchQuery = cleanAnimeTitle(cleanSlug.replace(/-/g, " "));
    if (searchQuery) {
      const searchRes = await searchAnime(searchQuery, undefined, 1, 5);
      if (searchRes && searchRes.length > 0) {
        const matchedSlug = String(searchRes[0].slug || searchRes[0].id).replace(/^\/+|\/+$/g, "");
        if (matchedSlug && matchedSlug !== cleanSlug) {
          const fallbackRes = await fetch(`${baseUrl}/anime/anime/${encodeURIComponent(matchedSlug)}`, {
            headers: {
              "User-Agent": DEFAULT_USER_AGENT,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(8000),
            next: { revalidate: 1800 },
          });
          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            if (fallbackJson.data && fallbackJson.data.title) {
              return mapSankaDetailToAnimeItem(matchedSlug, fallbackJson.data);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Fallback search for "${cleanSlug}" failed:`, err);
  }

  return null;
}

/**
 * 9. Search Anime on SankaVollereii
 * Returns full matching database results with all seasons & movies
 */
export async function searchAnime(
  query?: string,
  genre?: string,
  page = 1,
  perPage = 25
): Promise<AnimeItem[]> {
  const baseUrl = getSankaBaseUrl();
  const cleaned = cleanAnimeTitle(query || "");

  if (cleaned) {
    try {
      const res = await fetch(`${baseUrl}/anime/search/${encodeURIComponent(cleaned)}`, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json();
        const list = json.data?.animeList || [];
        if (Array.isArray(list)) {
          return list.slice(0, perPage).map(mapSankaToAnimeItem);
        }
      }
    } catch (err) {
      console.warn("Search error on Sanka:", err);
    }
  }

  // If genre filter is provided without query
  if (genre) {
    const genreRes = await getAnimeByGenre(genre, page);
    return genreRes.animeList;
  }

  // Fallback to Ongoing if no query is given
  return getOngoingAnime(page, perPage);
}

/**
 * 10. Unified Catalog Fetcher for Explore / Browse Page
 */
export async function fetchCatalog({
  category = "ongoing",
  genre = "",
  query = "",
  page = 1,
}: {
  category?: "ongoing" | "completed";
  genre?: string;
  query?: string;
  page?: number;
}): Promise<PaginatedAnimeResult> {
  const cleanQ = cleanAnimeTitle(query);

  // If search query is active, search takes precedence
  if (cleanQ) {
    const list = await searchAnime(cleanQ, undefined, page, 50);
    return {
      animeList: list,
      pagination: {
        currentPage: 1,
        hasNextPage: false,
        totalPages: 1,
      },
    };
  }

  // If a genre is selected, query the genre API endpoint
  if (genre) {
    return getAnimeByGenre(genre, page);
  }

  // When "Semua Genre" is active, query by category
  if (category === "completed") {
    return getCompletedAnimeList(page);
  }

  return getOngoingAnimeList(page);
}

/**
 * 11. Get Airing Schedule from SankaVollereii
 */
export async function getAiringSchedule(
  startTimestamp?: number,
  endTimestamp?: number
): Promise<ScheduleItem[]> {
  const baseUrl = getSankaBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/anime/schedule`, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const json = await res.json();
      const days = json.data || [];
      const schedules: ScheduleItem[] = [];

      if (Array.isArray(days)) {
        days.forEach((d: any) => {
          const dayName = d.day || "Lainnya";
          const animeList = d.anime_list || [];

          animeList.forEach((a: any) => {
            const slug = a.slug || a.animeId || "";
            if (!slug) return;

            schedules.push({
              id: slug,
              airingAt: Math.floor(Date.now() / 1000),
              timeUntilAiring: 0,
              episode: 1,
              day: dayName,
              media: mapSankaToAnimeItem({
                animeId: slug,
                title: a.title,
                poster: a.poster,
              }),
            });
          });
        });
      }

      return schedules;
    }
  } catch (err) {
    console.warn("Error fetching schedule from Sanka:", err);
  }
  return [];
}
