"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  SkipForward,
  Settings,
  Sparkles,
  Sun,
  Moon,
  Check,
  Subtitles,
  Gauge,
  Sliders,
  AlertCircle,
  RefreshCw,
  Server,
} from "lucide-react";
import { useUserSettings, useWatchHistory } from "@/hooks/useStorage";
import { StreamSource, SubtitleTrack, SubIndoProvider } from "@/types";
import { isEmbedServer, getAnimeEmbedUrl } from "@/services/stream";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  animeId: string | number;
  animeTitle: string;
  coverImage?: string;
  episodeNumber: number;
  sources?: StreamSource[];
  subtitles?: SubtitleTrack[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  nextEpisodeUrl?: string;
  prevEpisodeUrl?: string;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onSwitchServer?: (server: string) => void;
  currentServer?: string;
  audioPreference?: "sub" | "dub";
  customEmbedUrl?: string;
  isLoadingStream?: boolean;
  scrapeError?: {
    status?: number;
    domain?: string;
    message?: string;
  } | null;
  onRetryScrape?: () => void;
  availableQualities?: string[];
  currentQuality?: string;
  onSelectQuality?: (quality: string) => void;
  onSwitchToBackup?: () => void;
  provider?: SubIndoProvider;
  onSwitchProvider?: (provider: SubIndoProvider) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  animeId,
  animeTitle,
  coverImage = "",
  episodeNumber,
  sources = [],
  subtitles = [],
  intro,
  outro,
  nextEpisodeUrl,
  prevEpisodeUrl,
  isFocusMode,
  onToggleFocusMode,
  onSwitchServer,
  currentServer = "vidhide",
  audioPreference = "sub",
  customEmbedUrl,
  isLoadingStream = false,
  scrapeError = null,
  onRetryScrape,
  availableQualities = [],
  currentQuality = "",
  onSelectQuality,
  onSwitchToBackup,
  provider = "otakudesu",
  onSwitchProvider,
}) => {
  const router = useRouter();
  const { settings } = useUserSettings();
  const { saveProgress } = useWatchHistory();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isAmbientActive, setIsAmbientActive] = useState(settings.ambientMode);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("off");
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);

  // Get active source
  const activeSource = sources[0]?.url || "";
  const isEmbed = Boolean(customEmbedUrl) || isEmbedServer(currentServer);
  const embedUrl =
    customEmbedUrl ||
    (isEmbed ? getAnimeEmbedUrl(currentServer, animeId, episodeNumber, audioPreference) : "");

  // Mega server detector for CSS cropping of top bar/logo
  const isMega =
    currentServer?.toLowerCase().includes("mega") ||
    Boolean(embedUrl && (embedUrl.includes("mega.nz") || embedUrl.includes("mega.")));

  // Auto-save watch progress for Embed player
  useEffect(() => {
    if (isEmbed) {
      saveProgress({
        animeId,
        title: animeTitle,
        coverImage,
        episodeNumber,
        episodeId: `${animeId}-${episodeNumber}`,
        progressPercent: 95,
        currentTime: 1,
        duration: 1440,
      });
    }
  }, [isEmbed, animeId, episodeNumber, animeTitle, coverImage, saveProgress]);

  // 1. Initialize HLS or HTML5 Video
  useEffect(() => {
    if (isEmbed) return;

    const video = videoRef.current;
    if (!video) return;

    if (!activeSource) {
      setHasError(true);
      setErrorMessage("Sumber stream tidak ditemukan.");
      setIsBuffering(false);
      return;
    }

    setHasError(false);
    setErrorMessage("");
    setIsBuffering(true);

    const isM3U8 = activeSource.includes(".m3u8") || sources[0]?.isM3U8;

    if (Hls.isSupported() && isM3U8) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(activeSource);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        // Try autoplay muted if needed to comply with browser policy
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        if (data.details.totalduration) {
          setDuration(data.details.totalduration);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn("HLS Error encountered:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setHasError(true);
              setErrorMessage("Gagal memuat video stream dari server ini.");
              setIsBuffering(false);
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else {
      // Standard MP4 / WebM / Native Safari HLS
      video.src = activeSource;
      video.load();
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
        });
    }
  }, [activeSource, sources]);

  // 2. Continuous Watch Progress Auto-Save
  useEffect(() => {
    if (currentTime > 5 && duration > 10) {
      const progressPercent = (currentTime / duration) * 100;
      saveProgress({
        animeId,
        title: animeTitle,
        coverImage,
        episodeNumber,
        episodeId: `${animeId}-${episodeNumber}`,
        progressPercent,
        currentTime,
        duration,
      });
    }
  }, [currentTime, duration, animeId, animeTitle, coverImage, episodeNumber, saveProgress]);

  // 3. Skip Intro / Outro Monitor
  useEffect(() => {
    if (intro && currentTime >= intro.start && currentTime < intro.end) {
      if (settings.autoSkipIntro) {
        if (videoRef.current) {
          videoRef.current.currentTime = intro.end + 1;
        }
      } else {
        setShowSkipIntro(true);
      }
    } else {
      setShowSkipIntro(false);
    }
  }, [currentTime, intro, settings.autoSkipIntro]);

  // 4. Auto-Play Next Episode on End
  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    if (settings.autoPlayNext && nextEpisodeUrl) {
      setAutoPlayCountdown(5);
      const interval = setInterval(() => {
        setAutoPlayCountdown((prev) => {
          if (prev && prev > 1) return prev - 1;
          clearInterval(interval);
          router.push(nextEpisodeUrl);
          return null;
        });
      }, 1000);
    }
  }, [settings.autoPlayNext, nextEpisodeUrl, router]);

  // 5. Controls Visibility Idle Timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu) {
        setShowControls(false);
      }
    }, 3200);
  };

  // 6. Play / Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn("Play request was blocked by browser:", e);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // 7. Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  }, []);

  // 8. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        case "arrowleft":
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime -= 5;
          break;
        case "arrowright":
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime += 5;
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((v) => Math.min(1, v + 0.1));
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.1));
          break;
        case "n":
          if (e.shiftKey && nextEpisodeUrl) {
            e.preventDefault();
            router.push(nextEpisodeUrl);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleFullscreen, nextEpisodeUrl, router]);

  // Sync Volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Sync Playback Speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync Subtitles from Settings or Available Tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !subtitles || subtitles.length === 0) return;

    const tracks = video.textTracks;
    const prefLang = settings.subtitleLanguage || "id";

    if (prefLang === "off") {
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = "disabled";
      }
      setSelectedSubtitle("off");
      return;
    }

    let targetIndex = -1;
    for (let i = 0; i < tracks.length; i++) {
      const label = tracks[i].label || "";
      const lang = tracks[i].language || "";
      if (prefLang === "id" && (/indo|bahasa/i.test(label) || /indo|bahasa|id/i.test(lang))) {
        targetIndex = i;
        break;
      } else if (prefLang === "en" && (/eng/i.test(label) || /^en/i.test(lang))) {
        targetIndex = i;
        break;
      }
    }

    // Fallback: If Indonesian requested but not found, fallback to English
    if (targetIndex === -1 && prefLang === "id") {
      for (let i = 0; i < tracks.length; i++) {
        const label = tracks[i].label || "";
        const lang = tracks[i].language || "";
        if (/eng/i.test(label) || /^en/i.test(lang)) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1 && tracks.length > 0) {
      targetIndex = 0;
    }

    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === targetIndex ? "showing" : "disabled";
    }

    if (targetIndex >= 0 && tracks[targetIndex]) {
      setSelectedSubtitle(tracks[targetIndex].label || tracks[targetIndex].language || "Active");
    }
  }, [subtitles, settings.subtitleLanguage]);

  const handleSelectSubtitle = (targetLabel: string) => {
    const video = videoRef.current;
    if (!video) return;

    const tracks = video.textTracks;
    if (targetLabel === "off") {
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = "disabled";
      }
      setSelectedSubtitle("off");
      setShowSubtitleMenu(false);
      return;
    }

    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].label === targetLabel || tracks[i].language === targetLabel) {
        tracks[i].mode = "showing";
      } else {
        tracks[i].mode = "disabled";
      }
    }
    setSelectedSubtitle(targetLabel);
    setShowSubtitleMenu(false);
  };

  // Format Time Helper
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const skipIntroAction = () => {
    if (intro && videoRef.current) {
      videoRef.current.currentTime = intro.end + 0.5;
      setShowSkipIntro(false);
    }
  };

  const handleRetryServer = () => {
    setHasError(false);
    setIsBuffering(true);
    const nextServer =
      currentServer === "hd-1"
        ? "hd-2"
        : currentServer === "hd-2"
          ? "megacloud"
          : "hd-1";

    if (onSwitchServer) {
      onSwitchServer(nextServer);
    }
  };

  // -------------------------------------------------------------
  // HYBRID EMBED MODE (VidLink, AutoEmbed, VidSrc)
  // -------------------------------------------------------------
  if (isEmbed) {
    return (
      <div className="relative w-full">
        {/* Ambient Glow Canvas Layer (behind player) */}
        {isAmbientActive && (
          <div className="pointer-events-none absolute -inset-4 sm:-inset-8 z-0 opacity-40 blur-[80px] transition-opacity duration-700">
            <div className="w-full h-full bg-gradient-to-tr from-indigo-700/40 via-violet-600/30 to-indigo-950/20 rounded-full" />
          </div>
        )}

        {/* Main Player Frame */}
        <div
          ref={containerRef}
          className="relative z-10 w-full aspect-video rounded-3xl overflow-hidden bg-black border border-white/[0.14] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex items-center justify-center group select-none"
        >
          {/* Loading Stream Overlay */}
          {isLoadingStream && (
            <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-white">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold font-heading text-white">
                  Menghubungkan ke Server Vidhide / Mega...
                </p>
                <p className="text-xs text-slate-400">
                  Mengambil video Sub Indo kualitas terbaik
                </p>
              </div>
            </div>
          )}

          {/* Scrape Error Overlay */}
          {scrapeError && !customEmbedUrl && (
            <div className="absolute inset-0 z-30 bg-[#08090C]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-base font-bold font-heading text-white mb-1">
                Server Belum Tersedia
              </h3>
              <p className="text-xs text-slate-300 mb-4 max-w-md">
                {scrapeError.message ||
                  "Server stream belum tersedia untuk episode ini."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {onSwitchProvider ? (
                  <>
                    {provider !== "otakudesu" && (
                      <button
                        type="button"
                        onClick={() => onSwitchProvider("otakudesu")}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Beralih ke Otakudesu (1-Klik)
                      </button>
                    )}
                    {provider !== "samehadaku" && (
                      <button
                        type="button"
                        onClick={() => onSwitchProvider("samehadaku")}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Beralih ke Samehadaku (1-Klik)
                      </button>
                    )}
                    {provider !== "kuramanime" && (
                      <button
                        type="button"
                        onClick={() => onSwitchProvider("kuramanime")}
                        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Beralih ke Kuramanime (1-Klik)
                      </button>
                    )}
                  </>
                ) : onSwitchToBackup ? (
                  <button
                    type="button"
                    onClick={onSwitchToBackup}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {provider === "samehadaku"
                      ? "Beralih ke Otakudesu (1-Klik)"
                      : "Beralih ke Samehadaku (1-Klik)"}
                  </button>
                ) : null}

                {onRetryScrape && (
                  <button
                    type="button"
                    onClick={onRetryScrape}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                  </button>
                )}
              </div>
            </div>
          )}

          {embedUrl ? (
            <div className="w-full h-full overflow-hidden flex items-center justify-center relative">
              <iframe
                key={embedUrl}
                src={embedUrl}
                title={`${animeTitle} - Episode ${episodeNumber}`}
                className={cn(
                  "border-0 transition-all",
                  isMega
                    ? "-mt-12 h-[calc(100%+3rem)] w-full"
                    : "w-full h-full"
                )}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            !isLoadingStream && !scrapeError && (
              <div className="text-center text-xs text-slate-400">
                Pilih episode atau server untuk memulai streaming
              </div>
            )
          )}

          {/* Floating Controls Overlay (Top Right) */}
          <div className="pointer-events-none absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
            {/* Real Quality / Resolution Switcher Button */}
            {availableQualities && availableQualities.length > 0 && (
              <div className="relative pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-xl transition-all shadow-lg",
                    showQualityMenu
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      : "bg-black/60 border-white/15 text-slate-200 hover:bg-black/80 hover:text-white"
                  )}
                  title="Pilih Kualitas Video (Resolusi)"
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentQuality || availableQualities[0]}</span>
                </button>

                {/* Popover Menu for Resolutions */}
                {showQualityMenu && (
                  <div className="absolute top-full mt-2 right-0 w-36 rounded-2xl bg-[#0F1117]/95 border border-white/20 p-2 shadow-2xl backdrop-blur-3xl space-y-1 z-30 animate-in fade-in duration-150">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1 border-b border-white/10">
                      Resolusi Video
                    </div>
                    {availableQualities.map((q) => {
                      const isSelected = (currentQuality || availableQualities[0]) === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            if (onSelectQuality) onSelectQuality(q);
                            setShowQualityMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors text-left",
                            isSelected
                              ? "bg-indigo-600 text-white font-semibold"
                              : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                          )}
                        >
                          <span>{q}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 ml-1 text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Ambient Toggle */}
            <button
              onClick={() => setIsAmbientActive(!isAmbientActive)}
              className={cn(
                "pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-xl transition-all shadow-lg",
                isAmbientActive
                  ? "bg-indigo-600/80 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  : "bg-black/60 border-white/15 text-slate-300 hover:bg-black/80 hover:text-white"
              )}
              title="Pendaran Cahaya Ambient"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline">Ambient</span>
            </button>

            {/* Focus Mode Toggle */}
            <button
              onClick={onToggleFocusMode}
              className={cn(
                "pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-xl transition-all shadow-lg",
                isFocusMode
                  ? "bg-amber-500/80 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  : "bg-black/60 border-white/15 text-slate-300 hover:bg-black/80 hover:text-white"
              )}
              title="Mode Fokus (Matikan Lampu)"
            >
              {isFocusMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFocusMode ? "Lampu Nyala" : "Fokus"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CUSTOM HLS MODE (HTML5 + HLS.js)
  // -------------------------------------------------------------
  return (
    <div className="relative w-full">
      {/* Ambient Glow Canvas Layer (behind player) */}
      {isAmbientActive && (
        <div className="pointer-events-none absolute -inset-4 sm:-inset-8 z-0 opacity-40 blur-[80px] transition-opacity duration-700">
          <div className="w-full h-full bg-gradient-to-tr from-indigo-700/40 via-violet-600/30 to-indigo-950/20 rounded-full" />
        </div>
      )}

      {/* Main Player Frame */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className={cn(
          "relative z-10 w-full aspect-video rounded-3xl overflow-hidden bg-black border border-white/[0.14] shadow-[0_25px_60px_rgba(0,0,0,0.85)] group select-none flex items-center justify-center",
          settings.subtitleSize === "sm" && "sub-size-sm",
          settings.subtitleSize === "lg" && "sub-size-lg",
          (!settings.subtitleSize || settings.subtitleSize === "md") && "sub-size-md"
        )}
      >
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              if (videoRef.current.buffered.length > 0) {
                setBuffered(
                  (videoRef.current.buffered.end(
                    videoRef.current.buffered.length - 1
                  ) /
                    (duration || 1)) *
                  100
                );
              }
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              setIsBuffering(false);
            }
          }}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnded}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        >
          {subtitles.map((sub, idx) => (
            <track
              key={`${sub.url}-${idx}`}
              kind="subtitles"
              label={sub.label || `Track ${idx + 1}`}
              srcLang={sub.lang || "en"}
              src={sub.url}
            />
          ))}
        </video>

        {/* Buffering Indicator */}
        {isBuffering && !hasError && (
          <div className="absolute z-20 pointer-events-none flex flex-col items-center gap-2 text-white">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-300 font-medium">
              Memuat Stream Video...
            </span>
          </div>
        )}

        {/* Error Overlay with Fallback Button */}
        {hasError && (
          <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-base font-bold font-heading text-white">
                Gagal Memutar Episode
              </h4>
              <p className="text-xs text-slate-400">
                {errorMessage ||
                  "Server sumber sedang sibuk atau URL stream tidak dapat diakses."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleRetryServer}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition-transform active:scale-95"
              >
                <Server className="w-4 h-4" /> Beralih ke Server Lain
              </button>
            </div>
          </div>
        )}

        {/* Center Big Play/Pause Splash Indicator when Paused */}
        {!isPlaying && !isBuffering && !hasError && (
          <button
            onClick={togglePlay}
            className="absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400/50 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(99,102,241,0.6)] transition-all hover:scale-105 active:scale-95"
            aria-label="Play Video"
          >
            <Play className="w-8 h-8 fill-white translate-x-0.5" />
          </button>
        )}

        {/* Floating Skip Intro / Outro Button */}
        {showSkipIntro && (
          <button
            onClick={skipIntroAction}
            className="absolute bottom-20 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl text-white text-xs font-semibold shadow-lg transition-transform active:scale-95 animate-bounce"
          >
            <SkipForward className="w-4 h-4 text-indigo-400" /> Lewati Lagu Pembuka (Intro)
          </button>
        )}

        {/* Auto-Play Next Episode Toast */}
        {autoPlayCountdown !== null && nextEpisodeUrl && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 p-6 rounded-3xl bg-[#0F1117]/95 border border-white/20 backdrop-blur-2xl shadow-2xl text-center space-y-3">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
            <h4 className="text-base font-bold text-white font-heading">
              Memutar Episode Berikutnya...
            </h4>
            <p className="text-xs text-slate-300">
              Episode berikutnya akan dimulai dalam{" "}
              <span className="font-mono text-indigo-400 font-bold text-sm">
                {autoPlayCountdown}s
              </span>
            </p>
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setAutoPlayCountdown(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={() => router.push(nextEpisodeUrl)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Putar Sekarang
              </button>
            </div>
          </div>
        )}

        {/* Error Overlay with Fallback Button */}
        {hasError && (
          <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-base font-bold font-heading text-white">
                Gagal Memutar Episode
              </h4>
              <p className="text-xs text-slate-400">
                {errorMessage ||
                  "Server sumber sedang sibuk atau URL stream tidak dapat diakses."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                onClick={() => onSwitchServer && onSwitchServer("vidlink")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition-transform active:scale-95"
              >
                <Server className="w-4 h-4" /> Beralih ke Server 1 (VidLink - Pasti Jalan)
              </button>
              <button
                onClick={handleRetryServer}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Server HLS Lain
              </button>
            </div>
          </div>
        )}

        {/* Top Header Bar Overlay */}
        <div
          className={cn(
            "absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="space-y-0.5">
            <h3 className="text-sm md:text-base font-bold font-heading text-white line-clamp-1">
              {animeTitle}
            </h3>
            <span className="text-xs font-mono text-indigo-400 tabular-nums">
              Episode {episodeNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Ambient Glow Mode Toggle */}
            <button
              onClick={() => setIsAmbientActive(!isAmbientActive)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-xl transition-all",
                isAmbientActive
                  ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-200"
                  : "bg-black/40 border-white/10 text-slate-400 hover:text-white"
              )}
              title="Toggle Ambient Light"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ambient</span>
            </button>

            {/* Focus Mode Toggle */}
            <button
              onClick={onToggleFocusMode}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-xl transition-all",
                isFocusMode
                  ? "bg-amber-500/30 border-amber-500/50 text-amber-200"
                  : "bg-black/40 border-white/10 text-slate-400 hover:text-white"
              )}
              title="Toggle Focus Mode (Lights Off)"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </button>
          </div>
        </div>

        {/* Bottom Control Bar Overlay */}
        <div
          className={cn(
            "absolute bottom-0 inset-x-0 z-20 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 space-y-3",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Progress Timeline Slider */}
          <div className="relative group/timeline w-full flex items-center">
            {/* Buffered track */}
            <div
              className="absolute left-0 h-1.5 bg-white/20 rounded-full pointer-events-none transition-all"
              style={{ width: `${buffered}%` }}
            />
            {/* Played track */}
            <div
              className="absolute left-0 h-1.5 bg-indigo-500 rounded-full pointer-events-none shadow-[0_0_12px_rgba(99,102,241,0.8)]"
              style={{
                width: `${(currentTime / (duration || 1)) * 100}%`,
              }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 opacity-0 cursor-pointer z-10"
              aria-label="Seek Video Time"
            />
          </div>

          {/* Controls Bottom Row */}
          <div className="flex items-center justify-between text-white text-xs">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white"
                title={isPlaying ? "Jeda (Spasi)" : "Putar (Spasi)"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime -= 10;
                }}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                title="Mundur 10 detik (←)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime += 10;
                }}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                title="Maju 10 detik (→)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {nextEpisodeUrl && (
                <button
                  onClick={() => router.push(nextEpisodeUrl)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                  title="Episode Berikutnya (Shift + N)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/volume">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-16 h-1 accent-indigo-500 bg-white/20 rounded cursor-pointer"
                  aria-label="Volume Slider"
                />
              </div>

              {/* Timestamp */}
              <div className="text-slate-300 font-mono text-[11px] tabular-nums pl-1">
                <span>{formatTime(currentTime)}</span>
                <span className="mx-1 text-slate-500">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 relative">
              {/* Dedicated Subtitle (CC) Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSubtitleMenu(!showSubtitleMenu);
                    setShowSettingsMenu(false);
                  }}
                  className={cn(
                    "p-2 rounded-full transition-colors flex items-center justify-center",
                    showSubtitleMenu || (selectedSubtitle && selectedSubtitle !== "off")
                      ? "bg-indigo-600/60 text-white border border-indigo-400/40"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  )}
                  title="Subtitle (CC)"
                >
                  <Subtitles className="w-4 h-4" />
                </button>

                {/* Subtitle Menu Popup */}
                {showSubtitleMenu && (
                  <div className="absolute bottom-12 right-0 w-48 rounded-2xl bg-[#0F1117]/95 border border-white/20 p-2.5 backdrop-blur-3xl shadow-2xl space-y-1.5 z-40 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 border-b border-white/10 flex items-center justify-between">
                      <span>Pilihan Subtitle</span>
                      <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">
                        CC
                      </span>
                    </div>

                    <button
                      onClick={() => handleSelectSubtitle("off")}
                      className={cn(
                        "w-full py-1.5 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between",
                        selectedSubtitle === "off"
                          ? "bg-indigo-600 text-white font-semibold"
                          : "text-slate-300 hover:bg-white/[0.08]"
                      )}
                    >
                      <span>Nonaktif (Off)</span>
                      {selectedSubtitle === "off" && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {subtitles.length > 0 ? (
                      subtitles.map((sub, idx) => {
                        const label = sub.label || `Track ${idx + 1}`;
                        const isSelected =
                          selectedSubtitle.toLowerCase() === label.toLowerCase() ||
                          (sub.lang && selectedSubtitle.toLowerCase() === sub.lang.toLowerCase());
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectSubtitle(label)}
                            className={cn(
                              "w-full py-1.5 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between",
                              isSelected
                                ? "bg-indigo-600 text-white font-semibold"
                                : "text-slate-300 hover:bg-white/[0.08]"
                            )}
                          >
                            <span className="truncate">{label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-[11px] text-slate-500 italic px-2 py-1">
                        Tidak ada subtitle tambahan
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settings Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSettingsMenu(!showSettingsMenu);
                    setShowSubtitleMenu(false);
                  }}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    showSettingsMenu
                      ? "bg-white/20 text-white"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  )}
                  title="Pengaturan Pemutar"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Settings Menu Popup */}
                {showSettingsMenu && (
                  <div className="absolute bottom-12 right-0 w-56 rounded-2xl bg-[#0F1117]/95 border border-white/20 p-3 backdrop-blur-3xl shadow-2xl space-y-3 z-40">
                    <div className="text-xs font-semibold text-white border-b border-white/10 pb-1.5 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      Pengaturan Player
                    </div>

                    {/* Speed Selector */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3" /> Kecepatan
                      </span>
                      <div className="flex gap-1">
                        {[0.75, 1, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackRate(speed)}
                            className={cn(
                              "flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all border",
                              playbackRate === speed
                                ? "bg-indigo-600 text-white border-indigo-400/40"
                                : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                            )}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quality Selector */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400">Kualitas Resolusi</span>
                      <div className="grid grid-cols-2 gap-1">
                        {["auto", "1080p", "720p", "480p"].map((q) => (
                          <button
                            key={q}
                            onClick={() => setSelectedQuality(q)}
                            className={cn(
                              "py-1 px-2 rounded-lg text-[10px] font-semibold text-left transition-all border flex items-center justify-between",
                              selectedQuality === q
                                ? "bg-indigo-600 text-white border-indigo-400/40"
                                : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                            )}
                          >
                            <span className="uppercase">{q}</span>
                            {selectedQuality === q && <Check className="w-2.5 h-2.5" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subtitle Track */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Subtitles className="w-3 h-3" /> Subtitle
                      </span>
                      <div className="flex gap-1">
                        {["Indonesian", "English", "Off"].map((sub) => (
                          <button
                            key={sub}
                            onClick={() => setSelectedSubtitle(sub)}
                            className={cn(
                              "flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all border",
                              selectedSubtitle === sub
                                ? "bg-indigo-600 text-white border-indigo-400/40"
                                : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                            )}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                title="Layar Penuh (F)"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
