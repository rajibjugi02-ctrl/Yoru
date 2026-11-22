"use client";

import React, { use, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Server,
  Sun,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import {
  FloatingEpisodeDrawer,
  DrawerMirrorItem,
} from "@/components/player/FloatingEpisodeDrawer";
import { GlassCard } from "@/components/ui/GlassCard";
import { SeasonDropdown } from "@/components/anime/SeasonDropdown";
import { slugToHumanTitle } from "@/lib/season-utils";
import { getAnimeDetails, searchAnime } from "@/services/anilist";
import { findBestAnimeMatch, cleanAnimeTitle } from "@/lib/scraper";
import { useUserSettings, useWatchHistory } from "@/hooks/useStorage";
import { AnimeItem, StreamEpisodeItem, SubIndoProvider } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{
    animeId: string;
    episodeId: string;
  }>;
}

const PREFERRED_SERVER_KEY = "yoru_preferred_server";
const PREFERRED_QUALITY_KEY = "yoru_preferred_quality";
const PREFERRED_PROVIDER_KEY = "yoru_preferred_provider";

function getStoredPreferredServer(): string {
  if (typeof window === "undefined") return "default";
  try {
    return localStorage.getItem(PREFERRED_SERVER_KEY) || "default";
  } catch {
    return "default";
  }
}

function setStoredPreferredServer(serverKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERRED_SERVER_KEY, serverKey);
  } catch { }
}

function getStoredPreferredQuality(): string {
  if (typeof window === "undefined") return "720p";
  try {
    return localStorage.getItem(PREFERRED_QUALITY_KEY) || "720p";
  } catch {
    return "720p";
  }
}

function setStoredPreferredQuality(quality: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERRED_QUALITY_KEY, quality);
  } catch { }
}

function normalizeServerKey(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("kuramadrive") || n.includes("kurama")) return "kuramadrive";
  if (n.includes("vidhide")) return "vidhide";
  if (n.includes("mega")) return "mega";
  if (n.includes("wibufile")) return "wibufile";
  if (n.includes("blogger") || n.includes("blogspot")) return "blogger";
  if (n.includes("default") || n.includes("desustream") || n.includes("odstream")) return "default";
  return n.trim();
}

function getStoredPreferredProvider(): SubIndoProvider {
  if (typeof window === "undefined") return "otakudesu";
  try {
    const val = localStorage.getItem(PREFERRED_PROVIDER_KEY);
    if (val === "samehadaku" || val === "otakudesu" || val === "kuramanime") return val as SubIndoProvider;
  } catch { }
  return "otakudesu";
}

function setStoredPreferredProvider(provider: SubIndoProvider): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERRED_PROVIDER_KEY, provider);
  } catch { }
}

// In-memory stream cache for instant flipping between episodes (10 min TTL)
interface StreamCacheEntry {
  data: any;
  timestamp: number;
}
const streamCache = new Map<string, StreamCacheEntry>();
const STREAM_CACHE_TTL = 10 * 60 * 1000;

export default function WatchPage({ params }: Props) {
  const { animeId, episodeId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlProvider = searchParams.get("provider") as SubIndoProvider | null;

  const { settings, updateSettings } = useUserSettings();
  const { saveProgress } = useWatchHistory();

  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [episodes, setEpisodes] = useState<StreamEpisodeItem[]>([]);
  const [provider, setProvider] = useState<SubIndoProvider>(() => {
    if (urlProvider === "samehadaku" || urlProvider === "otakudesu" || urlProvider === "kuramanime") {
      return urlProvider;
    }
    return getStoredPreferredProvider();
  });

  // Sync provider if URL query param changes
  useEffect(() => {
    if (
      urlProvider &&
      (urlProvider === "samehadaku" || urlProvider === "otakudesu" || urlProvider === "kuramanime") &&
      urlProvider !== provider
    ) {
      setProvider(urlProvider);
      setStoredPreferredProvider(urlProvider);
    }
  }, [urlProvider, provider]);
  const [selectedServer, setSelectedServer] = useState<string>("vidhide");
  const [audioPreference, setAudioPreference] = useState<"sub" | "dub">(
    settings.audioPreference || "sub"
  );
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Scraper Stream State
  const [customEmbedUrl, setCustomEmbedUrl] = useState<string>("");
  const [mirrors, setMirrors] = useState<DrawerMirrorItem[]>([]);
  const [selectedMirrorId, setSelectedMirrorId] = useState<string>("");
  const [selectedQuality, setSelectedQuality] = useState<string>("");
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(true);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(false);
  const [scrapeError, setScrapeError] = useState<{
    status?: number;
    domain?: string;
    message?: string;
  } | null>(null);

  // Sync settings
  useEffect(() => {
    if (settings.audioPreference) {
      setAudioPreference(settings.audioPreference);
    }
    if (settings.defaultQuality && settings.defaultQuality !== "auto") {
      setSelectedQuality(settings.defaultQuality);
    }
  }, [settings.audioPreference, settings.defaultQuality]);

  // 1. Direct Load Anime Details & Episode List from SankaVollereii
  const loadAnimeAndEpisodes = useCallback(async () => {
    setIsLoadingEpisodes(true);
    setScrapeError(null);
    setAnime(null);
    setEpisodes([]);

    try {
      let animeData = await getAnimeDetails(animeId);

      // Backwards compatibility strictly for positive numeric AniList IDs
      const numericId = Number(animeId);
      if (
        !animeData &&
        !isNaN(numericId) &&
        numericId > 0 &&
        String(numericId) === animeId.trim()
      ) {
        try {
          // Direct fetch from internal AniList GraphQL proxy
          const aniRes = await fetch(`/api/anime/episodes/${numericId}`);
          if (aniRes.ok) {
            const aniJson = await aniRes.json();
            if (aniJson.title) {
              animeData = {
                id: animeId,
                slug: animeId,
                title: {
                  romaji: aniJson.title,
                  english: aniJson.title,
                  userPreferred: aniJson.title,
                },
                coverImage: {
                  large: aniJson.coverImage?.large || aniJson.coverImage?.extraLarge || "",
                  medium: aniJson.coverImage?.medium || "",
                },
                episodeList: aniJson.episodes || [],
              } as any;
            }
          }
        } catch {
          // Fallback: search anime using generic query
          const searchResults = await searchAnime(String(animeId));
          if (searchResults && searchResults.length > 0) {
            const matchedSlug = searchResults[0].slug || String(searchResults[0].id);
            animeData = await getAnimeDetails(matchedSlug);
          }
        }
      }

      if (animeData) {
        setAnime(animeData);
        if (animeData.episodeList && animeData.episodeList.length > 0) {
          setEpisodes(animeData.episodeList);
        }
      }
    } catch (err: any) {
      console.error("Error loading anime details:", err);
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [animeId]);

  useEffect(() => {
    loadAnimeAndEpisodes();
  }, [loadAnimeAndEpisodes]);

  // Compute active episode
  const isNumericEp = !isNaN(Number(episodeId));
  const requestedEpNum = isNumericEp ? Number(episodeId) : 1;

  const currentEp = useMemo(() => {
    if (episodes.length === 0) return null;
    if (!isNumericEp) {
      const matchBySlug = episodes.find((e) => e.episodeSlug === episodeId);
      if (matchBySlug) return matchBySlug;
    }
    const matchByNum = episodes.find((e) => e.number === requestedEpNum);
    return matchByNum || episodes[0];
  }, [episodes, episodeId, isNumericEp, requestedEpNum]);

  const currentEpNum = currentEp?.number || requestedEpNum;

  const animeTitle = useMemo(() => {
    return (
      anime?.title.romaji ||
      anime?.title.english ||
      anime?.title.userPreferred ||
      slugToHumanTitle(animeId)
    );
  }, [anime, animeId]);

  // Save watch progress to localStorage
  useEffect(() => {
    if (anime && currentEp) {
      saveProgress({
        animeId,
        title: animeTitle,
        coverImage: anime.coverImage?.large || anime.coverImage?.medium || "",
        episodeNumber: currentEpNum,
        episodeId: currentEp.episodeSlug || String(currentEpNum),
        progressPercent: 5,
        currentTime: 0,
        duration: 1440,
      });
    }
  }, [anime, currentEp, animeId, animeTitle, currentEpNum, saveProgress]);

  // 2. Fetch Stream Video directly by episodeSlug with Sticky Server & Quality (User-controlled Provider)
  const fetchStream = useCallback(
    async (targetProvider = provider) => {
      setIsLoadingStream(true);
      setScrapeError(null);
      // Clean previous episode's servers immediately so dropdown doesn't show stale mirrors
      setMirrors([]);
      setSelectedMirrorId("");
      setCustomEmbedUrl("");

      const cacheKey = `${targetProvider}:${animeId}:${currentEpNum}`;
      const cached = streamCache.get(cacheKey);

      try {
        let data: any = null;

        if (cached && Date.now() - cached.timestamp < STREAM_CACHE_TTL) {
          data = cached.data;
        } else {
          let watchUrl = "";

          if (targetProvider === "samehadaku") {
            // Samehadaku: Auto-find by animeTitle & episodeNumber
            watchUrl = `/api/scrape/watch?animeTitle=${encodeURIComponent(
              animeTitle
            )}&episodeNumber=${currentEpNum}&provider=samehadaku`;
          } else if (targetProvider === "kuramanime") {
            // Kuramanime: Auto-find by animeTitle & episodeNumber
            watchUrl = `/api/scrape/watch?animeTitle=${encodeURIComponent(
              animeTitle
            )}&episodeNumber=${currentEpNum}&provider=kuramanime`;
          } else {
            // Otakudesu: Pass real episodeSlug along with animeTitle & episodeNumber for fallback
            const targetEpisodeSlug = currentEp?.episodeSlug || "";

            watchUrl = `/api/scrape/watch?episodeSlug=${encodeURIComponent(
              targetEpisodeSlug
            )}&animeTitle=${encodeURIComponent(
              animeTitle
            )}&episodeNumber=${currentEpNum}&provider=otakudesu`;
          }

          const res = await fetch(watchUrl, { signal: AbortSignal.timeout(15000) });
          data = await res.json();

          if (res.ok && data.iframeUrl && data.mirrors && data.mirrors.length > 0) {
            streamCache.set(cacheKey, { data, timestamp: Date.now() });
          }
        }

        if (data && data.iframeUrl && data.mirrors && data.mirrors.length > 0) {
          setMirrors(data.mirrors);

          // Sticky Server & Quality: Match previously chosen server & resolution from localStorage
          const preferredKey = getStoredPreferredServer();
          const preferredQuality = getStoredPreferredQuality().toLowerCase();

          // 1. Try matching server key AND quality
          let chosenMirror = data.mirrors.find((m: DrawerMirrorItem) => {
            const k = normalizeServerKey(m.name);
            const q = (m.quality || "").toLowerCase();
            return k === preferredKey && q.includes(preferredQuality);
          });

          // 2. Try matching server key alone
          if (!chosenMirror) {
            chosenMirror = data.mirrors.find((m: DrawerMirrorItem) => {
              const k = normalizeServerKey(m.name);
              return k === preferredKey;
            });
          }

          // 3. Fallback to Default Stream or first mirror if preferred server isn't available
          if (!chosenMirror) {
            chosenMirror =
              data.mirrors.find((m: DrawerMirrorItem) => normalizeServerKey(m.name) === "default" || normalizeServerKey(m.name) === "kuramadrive") ||
              data.mirrors[0];
          }

          const activeKey = normalizeServerKey(chosenMirror.name);
          setSelectedServer(activeKey);
          setSelectedMirrorId(chosenMirror.id);

          if (chosenMirror.quality) {
            setSelectedQuality(chosenMirror.quality);
          }

          // Direct embed (e.g. Default Stream / Desustream / Kuramadrive) vs dynamic server resolution
          if (chosenMirror.dataContent && !chosenMirror.serverId) {
            setCustomEmbedUrl(chosenMirror.dataContent);
          } else if (chosenMirror.serverId) {
            try {
              const sRes = await fetch(
                `/api/scrape/server?serverId=${encodeURIComponent(
                  chosenMirror.serverId
                )}&provider=${targetProvider}`,
                { signal: AbortSignal.timeout(10000) }
              );
              const sData = await sRes.json();
              if (sRes.ok && sData.url) {
                setCustomEmbedUrl(sData.url);
              } else {
                setCustomEmbedUrl(data.iframeUrl);
              }
            } catch {
              setCustomEmbedUrl(data.iframeUrl);
            }
          } else {
            setCustomEmbedUrl(data.iframeUrl);
          }

          setScrapeError(null);
        } else {
          // Keep provider strictly as selected by user, never auto-switch!
          const domainLabel =
            targetProvider === "samehadaku"
              ? "Samehadaku"
              : targetProvider === "kuramanime"
                ? "Kuramanime"
                : "Otakudesu";

          setScrapeError({
            status: data?.status || 404,
            domain: domainLabel,
            message:
              data?.error ||
              `Episode ${currentEpNum} belum tersedia di server ${domainLabel}. Anda dapat mencoba beralih ke provider alternatif.`,
          });
          setCustomEmbedUrl("");
        }
      } catch (err: any) {
        console.error("Error loading watch stream:", err);
        const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
        const domainLabel =
          targetProvider === "samehadaku"
            ? "Samehadaku"
            : targetProvider === "kuramanime"
              ? "Kuramanime"
              : "Otakudesu";

        setScrapeError({
          status: isTimeout ? 504 : 500,
          domain: domainLabel,
          message: isTimeout
            ? "Request ke server stream timeout setelah 15 detik."
            : `Server ${domainLabel} belum tersedia untuk episode ini.`,
        });
        setCustomEmbedUrl("");
      } finally {
        setIsLoadingStream(false);
      }
    },
    [provider, currentEp, animeTitle, currentEpNum, animeId]
  );

  useEffect(() => {
    if (currentEp?.episodeSlug || provider === "samehadaku" || provider === "kuramanime") {
      fetchStream();
    }
  }, [fetchStream, currentEp?.episodeSlug, provider]);

  // Handle Switch Provider (Otakudesu <-> Samehadaku <-> Kuramanime)
  const handleSwitchProvider = async (newProvider: SubIndoProvider) => {
    if (newProvider === provider) return;
    setProvider(newProvider);
    setStoredPreferredProvider(newProvider);
    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("provider", newProvider);
      window.history.replaceState({}, "", currentUrl.toString());
    } catch { }
    await fetchStream(newProvider);
  };

  // Handle Mirror Selection (Saves to localStorage)
  const handleSelectMirror = async (mirror: DrawerMirrorItem) => {
    setSelectedMirrorId(mirror.id);
    const key = normalizeServerKey(mirror.name);
    setSelectedServer(key);
    setStoredPreferredServer(key);

    if (mirror.quality) {
      setSelectedQuality(mirror.quality);
      setStoredPreferredQuality(mirror.quality);
    }

    // Direct embed URL (e.g. Default Stream / Desustream)
    if (mirror.dataContent && !mirror.serverId) {
      setCustomEmbedUrl(mirror.dataContent);
      setScrapeError(null);
      return;
    }

    if (mirror.serverId) {
      setIsLoadingStream(true);
      try {
        const sRes = await fetch(
          `/api/scrape/server?serverId=${encodeURIComponent(
            mirror.serverId
          )}&provider=${provider}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const sData = await sRes.json();
        if (sRes.ok && sData.url) {
          setCustomEmbedUrl(sData.url);
          setScrapeError(null);
        }
      } catch (err) {
        console.error("Error switching server mirror:", err);
      } finally {
        setIsLoadingStream(false);
      }
    }
  };

  // 1-Click Cycle to next available mirror
  const handleCycleMirror = async () => {
    if (mirrors.length <= 1) return;
    const currentIndex = mirrors.findIndex((m) => m.id === selectedMirrorId);
    const nextIndex = (currentIndex + 1) % mirrors.length;
    await handleSelectMirror(mirrors[nextIndex]);
  };

  // Group mirrors by current active server
  const currentServerMirrors = useMemo(() => {
    return mirrors.filter((m) => {
      const lower = m.name.toLowerCase();
      const sel = selectedServer.toLowerCase();
      if (sel === "vidhide") return lower.includes("vidhide");
      if (sel === "mega") return lower.includes("mega");
      if (sel === "wibufile") return lower.includes("wibufile");
      if (sel === "desustream") return lower.includes("desustream") || lower.includes("default");
      return lower.includes(sel);
    });
  }, [mirrors, selectedServer]);

  // Extract unique available qualities for the active server
  const availableQualities = useMemo(() => {
    const sourceMirrors = currentServerMirrors.length > 0 ? currentServerMirrors : mirrors;
    const list = sourceMirrors
      .map((m) => m.quality)
      .filter((q): q is string => Boolean(q));
    return Array.from(new Set(list));
  }, [currentServerMirrors, mirrors]);

  const activeMirror =
    mirrors.find((m) => m.id === selectedMirrorId) ||
    currentServerMirrors[0] ||
    mirrors[0];

  const currentQuality =
    activeMirror?.quality || selectedQuality || availableQualities[0] || "720p";

  // Select resolution quality from player menu
  const handleSelectQuality = async (q: string) => {
    setSelectedQuality(q);
    setStoredPreferredQuality(q);
    const targetMirror =
      currentServerMirrors.find(
        (m) => m.quality.toLowerCase() === q.toLowerCase()
      ) ||
      mirrors.find((m) => m.quality.toLowerCase() === q.toLowerCase()) ||
      currentServerMirrors[0];

    if (targetMirror) {
      await handleSelectMirror(targetMirror);
    }
  };

  // Switch server (preserves preferred server choice)
  const handleSwitchServer = async (newServerKey: string) => {
    const key = normalizeServerKey(newServerKey);
    setSelectedServer(key);
    setStoredPreferredServer(key);

    const targetServerMirrors = mirrors.filter(
      (m) => normalizeServerKey(m.name) === key
    );
    const targetMirror =
      targetServerMirrors.find(
        (m) =>
          selectedQuality &&
          m.quality.toLowerCase() === selectedQuality.toLowerCase()
      ) || targetServerMirrors[0];

    if (targetMirror) {
      await handleSelectMirror(targetMirror);
    }
  };

  const cover =
    anime?.coverImage?.large || anime?.coverImage?.medium || "";

  const prevEp = episodes.find((e) => e.number === currentEpNum - 1);
  const nextEp = episodes.find((e) => e.number === currentEpNum + 1);

  const prevUrl = prevEp
    ? `/watch/${animeId}/${prevEp.number}?provider=${provider}`
    : undefined;
  const nextUrl = nextEp
    ? `/watch/${animeId}/${nextEp.number}?provider=${provider}`
    : undefined;

  return (
    <div
      className={cn(
        "space-y-6 transition-colors duration-500 pt-20 md:pt-24 pb-36 md:pb-24 max-w-7xl mx-auto overflow-x-hidden",
        isFocusMode && "bg-black/95 py-4 px-2 md:px-6 rounded-3xl"
      )}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/anime/${animeId}`}
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Detail Anime
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm md:text-base font-bold font-heading text-white line-clamp-1">
                {animeTitle}
              </h1>
              <SeasonDropdown
                animeTitle={animeTitle}
                currentSlug={String(animeId)}
                target="watch"
                variant="pill"
              />
            </div>
            <span className="text-xs text-indigo-400 font-mono tabular-nums">
              Menonton Episode {currentEpNum}
            </span>
          </div>
        </div>

        {/* Source Provider Switcher & Quick Prev/Next Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center p-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleSwitchProvider("otakudesu")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                provider === "otakudesu"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Otakudesu
            </button>
            <button
              type="button"
              onClick={() => handleSwitchProvider("samehadaku")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                provider === "samehadaku"
                  ? "bg-amber-500 text-black font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Samehadaku
            </button>
            <button
              type="button"
              onClick={() => handleSwitchProvider("kuramanime")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                provider === "kuramanime"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Kuramanime
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {prevUrl && (
              <Link
                href={prevUrl}
                prefetch={true}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Eps Sebelumnya
              </Link>
            )}

            {nextUrl && (
              <Link
                href={nextUrl}
                prefetch={true}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/40 text-xs font-medium text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]"
              >
                Eps Berikutnya <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Theater Layout (Player + Floating Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left (2 Columns on Desktop): Video Player Shell */}
        <div className="lg:col-span-2 space-y-4">
          <VideoPlayer
            animeId={animeId}
            animeTitle={animeTitle}
            coverImage={cover}
            episodeNumber={currentEpNum}
            nextEpisodeUrl={nextUrl}
            prevEpisodeUrl={prevUrl}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
            onSwitchServer={handleSwitchServer}
            currentServer={selectedServer}
            audioPreference={audioPreference}
            customEmbedUrl={customEmbedUrl}
            isLoadingStream={isLoadingStream}
            scrapeError={scrapeError}
            onRetryScrape={() => fetchStream()}
            availableQualities={availableQualities}
            currentQuality={currentQuality}
            onSelectQuality={handleSelectQuality}
            onSwitchToBackup={() =>
              handleSwitchProvider(provider === "otakudesu" ? "samehadaku" : "otakudesu")
            }
            provider={provider}
            onSwitchProvider={handleSwitchProvider}
          />

          {/* Quick Troubleshooting & Provider Switch Bar (Hidden when player error overlay already shows switch buttons) */}
          {!isFocusMode && (!scrapeError || customEmbedUrl) && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 text-xs backdrop-blur-xl">
              <div className="flex items-center gap-2.5 text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="font-medium">
                  {provider === "otakudesu"
                    ? "Video mati, file terhapus, atau layar hitam?"
                    : provider === "samehadaku"
                      ? "Sedang memutar dari cadangan Samehadaku."
                      : "Sedang memutar dari cadangan Kuramanime."}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {provider !== "otakudesu" && (
                  <button
                    type="button"
                    onClick={() => handleSwitchProvider("otakudesu")}
                    disabled={isLoadingStream}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn("w-3.5 h-3.5", isLoadingStream && "animate-spin")}
                    />
                    Beralih ke Otakudesu
                  </button>
                )}

                {provider !== "samehadaku" && (
                  <button
                    type="button"
                    onClick={() => handleSwitchProvider("samehadaku")}
                    disabled={isLoadingStream}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn("w-3.5 h-3.5", isLoadingStream && "animate-spin")}
                    />
                    Beralih ke Samehadaku (1-Klik)
                  </button>
                )}

                {provider !== "kuramanime" && (
                  <button
                    type="button"
                    onClick={() => handleSwitchProvider("kuramanime")}
                    disabled={isLoadingStream}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn("w-3.5 h-3.5", isLoadingStream && "animate-spin")}
                    />
                    Beralih ke Kuramanime
                  </button>
                )}

                {mirrors.length > 1 && (
                  <button
                    type="button"
                    onClick={handleCycleMirror}
                    disabled={isLoadingStream}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    Coba Mirror Lain
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Under-player Info Card (Hidden in Focus Mode) */}
          {!isFocusMode && (
            <GlassCard variant="default" className="p-4 md:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold font-heading text-white">
                    {animeTitle} — Episode {currentEpNum}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.05] border border-white/[0.08] text-slate-300 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>
                        Sumber: <strong className="text-white capitalize">{provider}</strong>
                      </span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.05] border border-white/[0.08] text-slate-300">
                      Server: <strong className="text-white">{activeMirror ? `${activeMirror.name} (${activeMirror.quality})` : "Sub Indo"}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Audio: JP (Sub Indo)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Direct Embed Stream (Bebas Iklan)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    100% BEBAS IKLAN
                  </span>
                </div>
              </div>

              {/* Keyboard Shortcuts Hint Bar (Desktop Only) */}
              <div className="pt-3 border-t border-white/[0.06] hidden md:flex flex-wrap gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">
                    Spasi
                  </kbd>{" "}
                  Play/Pause
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">
                    F
                  </kbd>{" "}
                  Fullscreen
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">
                    ← / →
                  </kbd>{" "}
                  ±5 detik
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">
                    Shift + N
                  </kbd>{" "}
                  Next Eps
                </span>
              </div>
            </GlassCard>
          )}

          {/* Floating Exit Focus Mode Button (Only in Focus Mode) */}
          {isFocusMode && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setIsFocusMode(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white shadow-xl backdrop-blur-xl transition-all"
              >
                <Sun className="w-4 h-4 text-amber-300" /> Keluar dari Mode Fokus
              </button>
            </div>
          )}
        </div>

        {/* Right (1 Column on Desktop): Floating Episode Drawer & Server Switcher */}
        {!isFocusMode && (
          <div className="lg:col-span-1">
            <FloatingEpisodeDrawer
              animeId={animeId}
              currentEpisodeNumber={currentEpNum}
              episodes={episodes}
              selectedServer={selectedServer}
              onSelectServer={handleSwitchServer}
              audioPreference={audioPreference}
              onSelectAudioPreference={() => { }}
              mirrors={mirrors}
              selectedMirrorId={selectedMirrorId}
              onSelectMirror={handleSelectMirror}
              scrapeError={scrapeError}
              isLoadingEpisodes={isLoadingEpisodes}
              isLoadingStream={isLoadingStream}
              provider={provider}
              onSwitchProvider={handleSwitchProvider}
            />
          </div>
        )}
      </div>
    </div>
  );
}
