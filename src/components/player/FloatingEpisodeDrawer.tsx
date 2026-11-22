"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Server,
  Check,
  Search,
  ChevronDown,
  Sparkles,
  Play,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StreamEpisodeItem, SubIndoProvider } from "@/types";
import { useWatchHistory } from "@/hooks/useStorage";
import { cn } from "@/lib/utils";

export interface DrawerMirrorItem {
  id: string;
  name: string;
  quality: string;
  serverId?: string;
  dataContent?: string;
  provider?: SubIndoProvider;
}

interface FloatingEpisodeDrawerProps {
  animeId: string | number;
  currentEpisodeNumber: number;
  episodes: StreamEpisodeItem[];
  selectedServer: string;
  onSelectServer: (server: string) => void;
  audioPreference?: "sub" | "dub";
  onSelectAudioPreference?: (audio: "sub" | "dub") => void;
  mirrors?: DrawerMirrorItem[];
  selectedMirrorId?: string;
  onSelectMirror?: (mirror: DrawerMirrorItem) => void;
  scrapeError?: {
    status?: number;
    domain?: string;
    message?: string;
  } | null;
  isLoadingEpisodes?: boolean;
  isLoadingStream?: boolean;
  provider?: SubIndoProvider;
  onSwitchProvider?: (provider: SubIndoProvider) => void;
}

export const FloatingEpisodeDrawer: React.FC<FloatingEpisodeDrawerProps> = ({
  animeId,
  currentEpisodeNumber,
  episodes,
  selectedServer,
  onSelectServer,
  audioPreference = "sub",
  onSelectAudioPreference,
  mirrors = [],
  selectedMirrorId = "",
  onSelectMirror,
  scrapeError = null,
  isLoadingEpisodes = false,
  isLoadingStream = false,
  provider = "otakudesu",
  onSwitchProvider,
}) => {
  const [filterQuery, setFilterQuery] = useState("");
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { history } = useWatchHistory();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if this episode was watched previously
  const isEpisodeWatched = (epNumber: number) => {
    if (!isMounted) return false;
    return history.some(
      (h) =>
        (h.animeId === animeId || String(h.animeId) === String(animeId)) &&
        h.episodeNumber === epNumber &&
        h.progressPercent > 80
    );
  };

  const filteredEpisodes = episodes.filter((ep) =>
    filterQuery.trim() === ""
      ? true
      : ep.number.toString().includes(filterQuery) ||
        (ep.title && ep.title.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const activeMirror = mirrors.find((m) => m.id === selectedMirrorId) || mirrors[0];

  // Group mirrors by base server name to cleanly separate server choice from resolution
  const groupedServers = useMemo(() => {
    const map = new Map<
      string,
      {
        serverKey: string;
        name: string;
        mirrors: DrawerMirrorItem[];
        qualities: string[];
      }
    >();

    mirrors.forEach((m) => {
      const lower = m.name.toLowerCase();
      let serverKey = "other";
      let cleanName = m.name.replace(/\s*\d+p/i, "").trim();

      if (lower.includes("vidhide")) {
        serverKey = "vidhide";
        cleanName = "Server Vidhide";
      } else if (lower.includes("mega")) {
        serverKey = "mega";
        cleanName = "Server Mega";
      } else if (lower.includes("wibufile")) {
        serverKey = "wibufile";
        cleanName = "Server Wibufile";
      } else if (lower.includes("kuramadrive") || lower.includes("kurama")) {
        serverKey = "kuramadrive";
        cleanName = "Kuramadrive (Default)";
      } else if (lower.includes("desustream") || lower.includes("default")) {
        serverKey = "desustream";
        cleanName =
          provider === "samehadaku"
            ? "Default Stream"
            : provider === "kuramanime"
              ? "Kuramadrive (Default)"
              : "Desustream (Default)";
      } else if (lower.includes("blogger") || lower.includes("blogspot")) {
        serverKey = "blogger";
        cleanName = "Server Blogger";
      }

      if (!map.has(serverKey)) {
        map.set(serverKey, {
          serverKey,
          name: cleanName,
          mirrors: [],
          qualities: [],
        });
      }

      const group = map.get(serverKey)!;
      group.mirrors.push(m);
      if (m.quality && !group.qualities.includes(m.quality)) {
        group.qualities.push(m.quality);
      }
    });

    return Array.from(map.values());
  }, [mirrors, provider]);

  const currentGroup =
    groupedServers.find((g) =>
      activeMirror?.name.toLowerCase().includes(g.serverKey)
    ) ||
    groupedServers.find((g) => g.serverKey === selectedServer.toLowerCase()) ||
    groupedServers[0];

  const serverDisplayLabel = isLoadingStream
    ? "Memuat Server..."
    : currentGroup
      ? `${currentGroup.name} (${activeMirror?.quality || currentGroup.qualities[0] || "Auto"})`
      : "Pilih Server Sub Indo";

  return (
    <GlassCard
      variant="elevated"
      className="p-4 md:p-5 flex flex-col h-[520px] md:h-[620px] w-full"
    >
      {/* Header & Server Switcher */}
      <div className="space-y-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-bold font-heading text-white">
              Daftar Episode
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {episodes.length} Eps
          </span>
        </div>

        {/* Clean Server Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setShowServerMenu(!showServerMenu)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-medium truncate">
                  {serverDisplayLabel}
                </span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200", showServerMenu && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showServerMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-full mt-1.5 inset-x-0 z-50 rounded-2xl bg-[#0F1117]/95 border border-white/20 p-2 shadow-2xl backdrop-blur-3xl space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar"
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 px-2 py-1 flex items-center justify-between">
                    <span>Pilihan Server ({provider})</span>
                    <span className="text-[9px] font-mono text-emerald-400 font-normal">
                      {isLoadingStream ? "Memuat..." : `${groupedServers.length} Server Tersedia`}
                    </span>
                  </div>

                  {isLoadingStream ? (
                    <div className="py-4 px-2 text-center text-xs text-slate-400 space-y-1.5">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[11px] text-slate-400">Memuat server episode...</p>
                    </div>
                  ) : groupedServers.length > 0 ? (
                    groupedServers.map((group) => {
                      const isSelected =
                        currentGroup?.serverKey === group.serverKey ||
                        selectedServer.toLowerCase() === group.serverKey;

                      return (
                        <button
                          key={group.serverKey}
                          type="button"
                          onClick={() => {
                            onSelectServer(group.serverKey);
                            // Select the best quality mirror in this group
                            const targetMirror =
                              group.mirrors.find((m) => m.id === selectedMirrorId) ||
                              group.mirrors[0];
                            if (targetMirror && onSelectMirror) {
                              onSelectMirror(targetMirror);
                            }
                            setShowServerMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors text-left group cursor-pointer",
                            isSelected
                              ? "bg-indigo-600 text-white font-semibold shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                              : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                          )}
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <Server
                              className={cn(
                                "w-4 h-4 shrink-0",
                                group.serverKey === "vidhide"
                                  ? "text-indigo-400"
                                  : group.serverKey === "mega"
                                    ? "text-rose-400"
                                    : group.serverKey === "kuramadrive"
                                      ? "text-sky-400"
                                      : "text-emerald-400"
                              )}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white">
                                  {group.name}
                                </span>
                              </div>
                              {/* Badges for available resolutions */}
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {group.qualities.map((q) => (
                                  <span
                                    key={q}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                      isSelected
                                        ? "bg-white/20 text-white border-white/30"
                                        : "bg-white/[0.05] text-slate-300 border-white/[0.08]"
                                    )}
                                  >
                                    {q}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 shrink-0 ml-1 text-white" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-4 px-2 text-center text-[11px] text-slate-400 space-y-1">
                      <p className="font-medium text-slate-300">
                        Server belum tersedia untuk provider ini
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Coba beralih ke provider lain.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Sub / Dub Toggle Button */}
          {onSelectAudioPreference && (
            <div className="flex items-center p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.1] shrink-0">
              <button
                type="button"
                onClick={() => onSelectAudioPreference("sub")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer",
                  audioPreference === "sub"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="Subtitle Jepang / Asli"
              >
                SUB
              </button>
              <button
                type="button"
                onClick={() => onSelectAudioPreference("dub")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer",
                  audioPreference === "dub"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="Sulih Suara (Dub)"
              >
                DUB
              </button>
            </div>
          )}
        </div>

        {/* Search Episode Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Cari nomor atau judul episode..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Episode List Scroll Container */}
      <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1 custom-scrollbar">
        {isLoadingEpisodes ? (
          <div className="space-y-2 py-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse flex items-center p-3 gap-3"
              >
                <div className="w-7 h-7 rounded-xl bg-white/10 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3 w-20 bg-white/10 rounded" />
                  <div className="h-2 w-32 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEpisodes.length > 0 ? (
          filteredEpisodes.map((ep) => {
            const isCurrent = ep.number === currentEpisodeNumber;
            const watched = isEpisodeWatched(ep.number);

            return (
              <motion.div
                key={ep.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                <Link
                  href={`/watch/${encodeURIComponent(String(animeId))}/${ep.number}?provider=${provider}`}
                  prefetch={true}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl transition-all group border text-left",
                    isCurrent
                      ? "bg-indigo-600/20 border-indigo-500/40 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                      : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-transform group-hover:scale-105",
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/50"
                          : "bg-white/[0.05] text-slate-400 group-hover:text-white"
                      )}
                    >
                      {isCurrent ? <Play className="w-3.5 h-3.5 fill-current" /> : ep.number}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-xs font-semibold truncate",
                          isCurrent ? "text-white" : "text-slate-200"
                        )}
                      >
                        Episode {ep.number}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {ep.title && ep.title !== `Episode ${ep.number}`
                          ? ep.title
                          : `Episode ${ep.number} Subtitle Indonesia`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {watched && (
                      <div
                        className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30"
                        title="Sudah ditonton"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            {filterQuery ? "Episode tidak ditemukan" : "Belum ada episode tersedia"}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
