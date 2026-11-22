import { NextRequest, NextResponse } from "next/server";
import { StreamEpisodeItem } from "@/types";

export const dynamic = "force-dynamic";

interface AnilistMediaResponse {
  data?: {
    Media?: {
      id: number;
      title: {
        romaji?: string;
        english?: string;
        native?: string;
        userPreferred?: string;
      };
      episodes?: number | null;
      status?: string;
      nextAiringEpisode?: {
        episode: number;
      } | null;
      streamingEpisodes?: Array<{
        title?: string;
        thumbnail?: string;
        url?: string;
        site?: string;
      }> | null;
      coverImage?: {
        extraLarge?: string;
        large?: string;
        medium?: string;
      } | null;
    };
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ anilistId: string }> }
) {
  try {
    const { anilistId } = await context.params;
    const cleanIdStr = String(anilistId || "").trim();

    // Strict validation: must be positive integer only, reject slugs and 0
    if (!/^\d+$/.test(cleanIdStr) || parseInt(cleanIdStr, 10) <= 0) {
      return NextResponse.json(
        { error: "Invalid anilistId parameter" },
        { status: 400 }
      );
    }

    const id = parseInt(cleanIdStr, 10);

    // 1. Fetch official metadata from AniList GraphQL
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
            userPreferred
          }
          episodes
          status
          nextAiringEpisode {
            episode
          }
          streamingEpisodes {
            title
            thumbnail
            url
            site
          }
          coverImage {
            extraLarge
            large
            medium
          }
        }
      }
    `;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables: { id } }),
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `AniList API error: status ${res.status}` },
        { status: res.status }
      );
    }

    const json: AnilistMediaResponse = await res.json();
    const media = json.data?.Media;

    if (!media) {
      return NextResponse.json(
        { error: "Anime tidak ditemukan di AniList" },
        { status: 404 }
      );
    }

    const englishTitle = media.title.english || "";
    const romajiTitle = media.title.romaji || "";
    const primaryTitle = englishTitle || romajiTitle || media.title.userPreferred || `Anime #${id}`;

    const defaultCover =
      media.coverImage?.extraLarge ||
      media.coverImage?.large ||
      media.coverImage?.medium ||
      "";

    // 2. Determine base episode count from AniList
    let totalCount = media.episodes || 0;
    if (!totalCount && media.nextAiringEpisode) {
      totalCount = Math.max(1, media.nextAiringEpisode.episode - 1);
    }
    if (!totalCount && media.streamingEpisodes && media.streamingEpisodes.length > 0) {
      totalCount = media.streamingEpisodes.length;
    }
    if (!totalCount) {
      totalCount = 12;
    }

    // Map AniList streaming episodes for rich episode thumbnails & titles
    const streamingMap = new Map<number, { title?: string; thumbnail?: string }>();
    if (media.streamingEpisodes && media.streamingEpisodes.length > 0) {
      for (const se of media.streamingEpisodes) {
        if (!se.title) continue;
        const match =
          se.title.match(/Episode\s+(\d+)/i) ||
          se.title.match(/^(\d+)\s*[-:]/);
        if (match) {
          const epNum = parseInt(match[1], 10);
          streamingMap.set(epNum, se);
        }
      }
    }

    // 3. Search and get real episodes via aniwatch (HiAnime Scraper)
    let providerEpisodes: StreamEpisodeItem[] = [];

    try {
      const { HiAnime } = await import("aniwatch");
      const hianime = new HiAnime.Scraper();

      let matchedAnimeId = "";

      // Step 2a: Try search with English title
      if (englishTitle) {
        try {
          const searchRes = await Promise.race([
            hianime.search(englishTitle),
            new Promise<null>((r) => setTimeout(() => r(null), 4500)),
          ]);
          if (searchRes && searchRes.animes && searchRes.animes.length > 0) {
            matchedAnimeId = searchRes.animes[0].id || "";
          }
        } catch (searchErr) {
          console.warn(`HiAnime search with English title '${englishTitle}' failed:`, searchErr);
        }
      }

      // Step 2b: Fallback search with Romaji title if not found
      if (!matchedAnimeId && romajiTitle) {
        try {
          const searchRes = await Promise.race([
            hianime.search(romajiTitle),
            new Promise<null>((r) => setTimeout(() => r(null), 4500)),
          ]);
          if (searchRes && searchRes.animes && searchRes.animes.length > 0) {
            matchedAnimeId = searchRes.animes[0].id || "";
          }
        } catch (searchErr) {
          console.warn(`HiAnime search with Romaji title '${romajiTitle}' failed:`, searchErr);
        }
      }

      // Step 3: Fetch episodes from HiAnime if anime was matched
      if (matchedAnimeId) {
        try {
          const epData = await Promise.race([
            hianime.getEpisodes(matchedAnimeId),
            new Promise<null>((r) => setTimeout(() => r(null), 5000)),
          ]);

          if (epData && epData.episodes && epData.episodes.length > 0) {
            providerEpisodes = epData.episodes.map((ep) => {
              const se = streamingMap.get(ep.number);
              return {
                id: ep.episodeId || `${slug}-episode-${ep.number}`,
                number: ep.number,
                title: ep.title || se?.title || `Episode ${ep.number}`,
                thumbnail: se?.thumbnail || defaultCover,
                isFiller: ep.isFiller || false,
              };
            });
          }
        } catch (epErr) {
          console.warn(`HiAnime getEpisodes for '${matchedAnimeId}' failed:`, epErr);
        }
      }
    } catch (importErr) {
      console.warn("Could not initialize aniwatch HiAnime scraper:", importErr);
    }

    // 4. Return result: Use HiAnime episodes if available, or AniList full sequence
    if (providerEpisodes.length > 0) {
      return NextResponse.json({
        anilistId: id,
        title: primaryTitle,
        totalEpisodes: providerEpisodes.length,
        episodes: providerEpisodes,
        provider: "hianime",
      });
    }

    // Resilient Fallback: Build full sequence from AniList metadata
    const slug = (romajiTitle || englishTitle || "anime")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const fallbackEpisodes: StreamEpisodeItem[] = [];
    for (let i = 1; i <= totalCount; i++) {
      const se = streamingMap.get(i);
      fallbackEpisodes.push({
        id: `${slug}-episode-${i}`,
        number: i,
        title: se?.title || `Episode ${i}`,
        thumbnail: se?.thumbnail || defaultCover,
        isFiller: false,
      });
    }

    return NextResponse.json({
      anilistId: id,
      title: primaryTitle,
      totalEpisodes: totalCount,
      episodes: fallbackEpisodes,
      provider: "anilist-fallback",
    });
  } catch (error) {
    console.error("Critical error in /api/anime/episodes:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar episode anime", details: String(error) },
      { status: 500 }
    );
  }
}
