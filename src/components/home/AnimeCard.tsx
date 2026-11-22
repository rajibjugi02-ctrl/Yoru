"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Play, Bookmark, Check } from "lucide-react";
import { AnimeItem } from "@/types";
import { useWatchlist } from "@/hooks/useStorage";
import { cn } from "@/lib/utils";

interface AnimeCardProps {
  anime: AnimeItem;
  priority?: boolean;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  priority = false,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const { isInList, addToList, removeFromList } = useWatchlist();
  const isSavedInStorage = isInList(anime.id);
  const [optimisticSaved, setOptimisticSaved] = useState(isSavedInStorage);

  useEffect(() => {
    setOptimisticSaved(isSavedInStorage);
  }, [isSavedInStorage]);

  const title =
    anime.title.english ||
    anime.title.romaji ||
    anime.title.userPreferred ||
    "Anime";
  const cover =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    "";
  const score =
    anime.averageScore && anime.averageScore > 0
      ? (anime.averageScore / 10).toFixed(1)
      : null;

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !optimisticSaved;
    setOptimisticSaved(nextState);

    if (nextState) {
      addToList({
        animeId: anime.id,
        title,
        coverImage: cover,
        format: anime.format,
        averageScore: anime.averageScore ? anime.averageScore / 10 : undefined,
        status: "plan",
        totalEpisodes: anime.episodes,
      });
    } else {
      removeFromList(anime.id);
    }
  };

  return (
    <Link
      href={`/anime/${anime.id}`}
      prefetch={true}
      className="group relative block w-36 sm:w-44 md:w-48 shrink-0 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-2xl no-underline text-inherit"
    >
      {/* Poster Container */}
      <div
        style={{ aspectRatio: "2/3", position: "relative", width: "100%", overflow: "hidden" }}
        className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/[0.1] shadow-lg group-hover:border-white/[0.22] group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.7)] transition-all duration-200 group-hover:-translate-y-1"
      >
        {/* Specular top highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent z-10" />

        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 192px"
            priority={priority}
            unoptimized={true}
            referrerPolicy="no-referrer"
            onLoad={() => setImgLoaded(true)}
            style={{ objectFit: "cover" }}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-slate-500 text-xs">
            No Image
          </div>
        )}

        {/* Gradient shadow for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
          {anime.format && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-black/60 text-white/90 border border-white/10 backdrop-blur-md">
              {anime.format}
            </span>
          )}

          {/* Quick Watchlist Button */}
          <button
            onClick={handleToggleWatchlist}
            className={cn(
              "p-1.5 rounded-full transition-all duration-150 backdrop-blur-md",
              optimisticSaved
                ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                : "bg-black/50 text-slate-300 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100"
            )}
            title={optimisticSaved ? "Hapus dari Pustaka" : "Simpan ke Pustaka"}
            aria-label="Toggle Watchlist"
          >
            {optimisticSaved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-indigo-600/90 border border-indigo-400/50 backdrop-blur-md flex items-center justify-center text-white shadow-[0_0_25px_rgba(99,102,241,0.7)] group-hover:scale-105 transition-transform">
            <Play className="w-5 h-5 fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Bottom Metadata on Card */}
        <div className="absolute bottom-2.5 inset-x-2.5 z-10 flex items-center justify-between text-[11px]">
          {score ? (
            <span className="flex items-center gap-1 font-semibold text-amber-400 tabular-nums bg-black/60 px-1.5 py-0.5 rounded-md border border-white/10 backdrop-blur-md">
              <Star className="w-3 h-3 fill-amber-400" />
              {score}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-300 bg-black/60 px-1.5 py-0.5 rounded-md border border-white/10 backdrop-blur-md">
              {anime.status === "RELEASING" ? "Tayang" : "Tamat"}
            </span>
          )}
          {anime.episodes ? (
            <span className="text-slate-300 tabular-nums bg-black/60 px-1.5 py-0.5 rounded-md border border-white/10 backdrop-blur-md text-[10px]">
              {anime.episodes} Eps
            </span>
          ) : null}
        </div>
      </div>

      {/* Title & Genre Under Card */}
      <div className="mt-2.5 px-0.5 space-y-0.5">
        <h4 className="text-xs md:text-sm font-semibold font-heading text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
          {title}
        </h4>
        <p className="text-[11px] text-slate-500 line-clamp-1">
          {anime.genres && anime.genres.length > 0
            ? anime.genres.slice(0, 2).join(", ")
            : `${anime.seasonYear || "Anime"}`}
        </p>
      </div>
    </Link>
  );
};
