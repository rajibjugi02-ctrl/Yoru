import { StreamEpisodeData, StreamEpisodeItem, SubIndoProvider } from "@/types";

export interface StreamServer {
  id: string;
  name: string;
  type: "embed" | "hls";
  badge: string;
  description: string;
  provider: SubIndoProvider;
}

export const AVAILABLE_SERVERS: StreamServer[] = [
  {
    id: "vidhide",
    name: "Server Vidhide (Sub Indo)",
    type: "embed",
    badge: "Utama",
    description: "Server Vidhide Sub Indo (Cepat & Stabil)",
    provider: "otakudesu",
  },
  {
    id: "mega",
    name: "Server Mega (Sub Indo)",
    type: "embed",
    badge: "Alternatif",
    description: "Server Mega Sub Indo (Cadangan Cepat)",
    provider: "otakudesu",
  },
  {
    id: "samehadaku",
    name: "Server Samehadaku (Sub Indo)",
    type: "embed",
    badge: "Cadangan",
    description: "Server Samehadaku Sub Indo (Alternatif Anime Lama)",
    provider: "samehadaku",
  },
  {
    id: "kuramanime",
    name: "Server Kuramanime (Sub Indo)",
    type: "embed",
    badge: "Multi-Source",
    description: "Server Kuramanime Sub Indo (Kuramadrive & Archive)",
    provider: "kuramanime",
  },
];

export function isEmbedServer(serverId: string): boolean {
  return true;
}

export function getAnimeEmbedUrl(
  serverId: string,
  anilistId: number | string,
  episodeNumber: number,
  audioPreference: "sub" | "dub" = "sub"
): string {
  // Yoru uses direct scraped stream embeds from Otakudesu and Samehadaku
  return "";
}

/**
 * Fetch real episode list for an anime based on AniList ID and stream provider
 */
export async function getAnimeEpisodes(
  animeTitle: string,
  animeId?: number | string,
  totalEpisodesFromAnilist?: number | null
): Promise<StreamEpisodeItem[]> {
  if (animeId) {
    try {
      const isBrowser = typeof window !== "undefined";
      const endpoint = isBrowser
        ? `/api/anime/episodes/${animeId}`
        : `http://localhost:3000/api/anime/episodes/${animeId}`;

      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        next: { revalidate: 1800 },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.episodes && data.episodes.length > 0) {
          return data.episodes;
        }
      }
    } catch (err) {
      console.warn("Could not fetch real episodes from /api/anime/episodes:", err);
    }
  }

  // Fallback generation based on AniList count
  const count =
    totalEpisodesFromAnilist && totalEpisodesFromAnilist > 0
      ? totalEpisodesFromAnilist
      : 12;

  const sanitizedSlug = (animeTitle || "anime")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return Array.from({ length: count }, (_, i) => ({
    id: `${sanitizedSlug}-episode-${i + 1}`,
    number: i + 1,
    title: `Episode ${i + 1}`,
    isFiller: false,
  }));
}
