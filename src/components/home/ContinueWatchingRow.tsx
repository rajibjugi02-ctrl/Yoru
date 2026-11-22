"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Clock, X, History } from "lucide-react";
import { useWatchHistory } from "@/hooks/useStorage";

export const ContinueWatchingRow: React.FC = () => {
  const { history, isReady, removeProgress } = useWatchHistory();

  if (!isReady || history.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg md:text-xl font-bold font-heading text-white tracking-tight">
            Lanjutkan Menonton
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono tabular-nums">
          {history.length} Judul
        </span>
      </div>

      {/* Track */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar overscroll-x-contain">
        {history.map((item) => {
          const remainingSec = Math.max(0, item.duration - item.currentTime);
          const remainingMin = Math.ceil(remainingSec / 60);

          return (
            <div
              key={item.animeId}
              className="group relative w-64 md:w-72 shrink-0 rounded-2xl bg-white/[0.04] border border-white/[0.1] hover:border-white/[0.22] p-3 backdrop-blur-2xl transition-all duration-200 hover:shadow-[0_12px_30px_rgba(0,0,0,0.6)] flex flex-col justify-between"
            >
              {/* Top specular highlight */}
              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="flex gap-3">
                {/* Thumbnail with Play Icon */}
                <Link
                  href={`/watch/${item.animeId}/${item.episodeNumber}`}
                  prefetch={true}
                  className="relative aspect-video w-24 md:w-28 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                >
                  {item.coverImage ? (
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      sizes="112px"
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-950/40" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/90 border border-indigo-400/40 flex items-center justify-center text-white shadow-md">
                      <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                    </div>
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-1">
                    <Link
                      href={`/anime/${item.animeId}`}
                      prefetch={true}
                      className="text-xs md:text-sm font-semibold font-heading text-white truncate hover:text-indigo-300 transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </Link>
                    <button
                      onClick={() => removeProgress(item.animeId)}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      title="Hapus dari riwayat"
                      aria-label="Hapus dari riwayat"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-[11px] text-indigo-400 font-medium">
                    Episode {item.episodeNumber}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>Sisa {remainingMin}m</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 space-y-1">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, item.progressPercent))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
