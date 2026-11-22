export interface AnimeTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface AnimeCoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface AnimeStudioNode {
  name: string;
  isAnimationStudio: boolean;
}

export interface NextAiringEpisode {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface CharacterVoiceActor {
  character: {
    id: number;
    name: {
      full: string;
      native?: string;
    };
    image?: {
      large?: string;
      medium?: string;
    };
  };
  role: string;
  voiceActor?: {
    id: number;
    name: {
      full: string;
      native?: string;
    };
    languageV2?: string;
    image?: {
      large?: string;
    };
  };
}

export interface AnimeRelationEdge {
  relationType: string;
  node: {
    id: number;
    title: AnimeTitle;
    format?: string;
    status?: string;
    coverImage?: AnimeCoverImage;
    bannerImage?: string;
    averageScore?: number;
    seasonYear?: number;
  };
}

export interface AnimeRecommendationNode {
  mediaRecommendation?: {
    id: number;
    title: AnimeTitle;
    format?: string;
    coverImage?: AnimeCoverImage;
    averageScore?: number;
    episodes?: number;
  };
}

export interface AnimeItem {
  id: number | string;
  slug?: string;
  idMal?: number;
  title: AnimeTitle;
  coverImage?: AnimeCoverImage;
  bannerImage?: string;
  format?: string;
  status?: string;
  episodes?: number | null;
  duration?: number | null;
  season?: string;
  seasonYear?: number | null;
  averageScore?: number | null;
  popularity?: number;
  genres?: string[];
  studios?: {
    nodes: AnimeStudioNode[];
  };
  description?: string;
  nextAiringEpisode?: NextAiringEpisode | null;
  episodeList?: StreamEpisodeItem[];
  releaseDay?: string;
  latestReleaseDate?: string;
  characters?: {
    edges: Array<{
      role: string;
      node: {
        id: number;
        name: { full: string; native?: string };
        image?: { large?: string; medium?: string };
      };
      voiceActors?: Array<{
        id: number;
        name: { full: string; native?: string };
        languageV2?: string;
        image?: { large?: string };
      }>;
    }>;
  };
  relations?: {
    edges: AnimeRelationEdge[];
  };
  recommendations?: {
    nodes: AnimeRecommendationNode[];
  };
}

export interface ScheduleItem {
  id: number | string;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  media: AnimeItem;
  day?: string;
}

export interface StreamSource {
  url: string;
  isM3U8: boolean;
  quality?: string;
}

export interface SubtitleTrack {
  url: string;
  lang: string;
  label?: string;
  kind?: "subtitles" | "captions";
  default?: boolean;
}

export interface StreamEpisodeData {
  headers?: Record<string, string>;
  sources: StreamSource[];
  subtitles?: SubtitleTrack[];
  download?: string;
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
}

export interface StreamEpisodeItem {
  id: string;
  number: number;
  title?: string;
  isFiller?: boolean;
  thumbnail?: string;
  episodeSlug?: string;
  date?: string;
}

export interface WatchHistoryItem {
  animeId: number | string;
  title: string;
  coverImage: string;
  bannerImage?: string;
  episodeNumber: number;
  episodeId: string;
  progressPercent: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface WatchlistItem {
  animeId: number | string;
  title: string;
  coverImage: string;
  format?: string;
  averageScore?: number;
  status: "watching" | "plan" | "completed" | "dropped";
  addedAt: number;
  totalEpisodes?: number | null;
}

export interface UserPreferences {
  defaultQuality: "auto" | "1080p" | "720p" | "480p";
  autoPlayNext: boolean;
  autoSkipIntro: boolean;
  audioPreference: "sub" | "dub";
  subtitleLanguage: "id" | "en" | "off";
  subtitleSize: "sm" | "md" | "lg";
  ambientMode: boolean;
  elasticPullToRefresh: boolean;
  reducedMotion: boolean;
  apiServerUrl: string;
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  rank: string;
  updatedAt?: number;
}

export type SubIndoProvider = "otakudesu" | "samehadaku" | "kuramanime";

