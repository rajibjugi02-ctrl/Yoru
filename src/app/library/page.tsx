"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bookmark,
  Clock,
  CheckCircle2,
  Heart,
  Trash2,
  Play,
  Film,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useWatchlist, useWatchHistory } from "@/hooks/useStorage";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "watching" | "plan" | "completed" | "history";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const { watchlist, removeFromList, isReady } = useWatchlist();
  const { history, removeProgress } = useWatchHistory();

  const tabs = [
    { id: "all", label: "Semua Pustaka", count: watchlist.length },
    {
      id: "watching",
      label: "Sedang Ditonton",
      count: watchlist.filter((w) => w.status === "watching").length,
    },
    {
      id: "plan",
      label: "Rencana Nonton",
      count: watchlist.filter((w) => w.status === "plan").length,
    },
    {
      id: "completed",
      label: "Selesai",
      count: watchlist.filter((w) => w.status === "completed").length,
    },
    { id: "history", label: "Riwayat Putar", count: history.length },
  ] as const;

  const filteredWatchlist = watchlist.filter((item) => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-white flex items-center gap-2.5">
          <Bookmark className="w-7 h-7 text-indigo-400" /> Pustaka Saya
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-0.5">
          Kelola anime favorit, riwayat putar, dan rencana menonton secara privat di browser.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-slate-300 tabular-nums">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content: History View */}
      {activeTab === "history" ? (
        <div>
          {history.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {history.map((item) => (
                <GlassCard
                  key={item.animeId}
                  variant="interactive"
                  className="p-3.5 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    <Link
                      href={`/watch/${item.animeId}/${item.episodeNumber}`}
                      prefetch={true}
                      className="relative aspect-video w-24 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0"
                    >
                      {item.coverImage && (
                        <Image
                          src={item.coverImage}
                          alt={item.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white text-white" />
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/anime/${item.animeId}`}
                        prefetch={true}
                        className="text-xs font-semibold text-white truncate block hover:text-indigo-300"
                      >
                        {item.title}
                      </Link>
                      <span className="text-[11px] text-indigo-400 font-medium block mt-0.5">
                        Episode {item.episodeNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Progres: {Math.round(item.progressPercent)}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <Link
                      href={`/watch/${item.animeId}/${item.episodeNumber}`}
                      prefetch={true}
                    >
                      <GlassButton size="sm" variant="primary">
                        Lanjut Tonton
                      </GlassButton>
                    </Link>
                    <button
                      onClick={() => removeProgress(item.animeId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.05] transition-colors"
                      title="Hapus riwayat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-semibold text-white">
                Belum ada riwayat tontonan
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tonton episode anime pertama Anda, dan progres menit serta episode akan tersimpan otomatis di sini.
              </p>
              <Link href="/" prefetch={true}>
                <GlassButton variant="primary" size="md">
                  Jelajahi Anime Sekarang
                </GlassButton>
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* Tab Content: Watchlist View */
        <div>
          {filteredWatchlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredWatchlist.map((item) => (
                <div
                  key={item.animeId}
                  className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.2] overflow-hidden p-2.5 transition-all hover:-translate-y-1"
                >
                  <Link href={`/anime/${item.animeId}`} prefetch={true}>
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                      {item.coverImage && (
                        <Image
                          src={item.coverImage}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 140px, 180px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                  </Link>

                  <div className="mt-2 space-y-1">
                    <Link
                      href={`/anime/${item.animeId}`}
                      prefetch={true}
                      className="text-xs font-semibold text-white truncate block hover:text-indigo-300"
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{item.format || "Anime"}</span>
                      {item.averageScore && (
                        <span className="text-amber-400 font-semibold tabular-nums">
                          ⭐ {item.averageScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <Link href={`/watch/${item.animeId}/1`} prefetch={true}>
                      <span className="text-[11px] text-indigo-400 font-medium hover:underline flex items-center gap-1">
                        Putar <Play className="w-3 h-3 fill-current" />
                      </span>
                    </Link>
                    <button
                      onClick={() => removeFromList(item.animeId)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Hapus dari pustaka"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <Bookmark className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-semibold text-white">
                Pustaka masih kosong
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tambahkan anime ke daftar tontonan Anda dengan menekan tombol simpan atau ikon bookmark pada kartu anime.
              </p>
              <Link href="/" prefetch={true}>
                <GlassButton variant="primary" size="md">
                  Telusuri Beranda
                </GlassButton>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
