"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Trophy,
  Film,
  History,
  TrendingUp,
} from "lucide-react";
import { AnimeCard } from "./AnimeCard";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { AnimeItem } from "@/types";

export type IconType = "flame" | "sparkles" | "trophy" | "film" | "history" | "trending";

interface AnimeRowProps {
  title: string;
  iconName?: IconType;
  subtitle?: string;
  items: AnimeItem[];
  isLoading?: boolean;
  viewAllHref?: string;
}

const ICON_MAP = {
  flame: Flame,
  sparkles: Sparkles,
  trophy: Trophy,
  film: Film,
  history: History,
  trending: TrendingUp,
};

export const AnimeRow: React.FC<AnimeRowProps> = ({
  title,
  iconName,
  subtitle,
  items,
  isLoading = false,
  viewAllHref,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const Icon = iconName ? ICON_MAP[iconName] : null;

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -450 : 450;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-indigo-400" />}
            <h3 className="text-lg md:text-xl font-bold font-heading text-white tracking-tight">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mr-2 hover:underline"
            >
              Lihat Semua
            </Link>
          )}

          {/* Desktop Left/Right Scroll Controls */}
          <button
            onClick={() => handleScroll("left")}
            className="hidden md:flex p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
            aria-label="Geser ke kiri"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll("right")}
            className="hidden md:flex p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
            aria-label="Geser ke kanan"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Track */}
      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar scroll-smooth overscroll-x-contain"
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-36 sm:w-44 md:w-48 shrink-0 space-y-2">
              <SkeletonLoader variant="card" />
              <SkeletonLoader variant="text" className="w-4/5" />
              <SkeletonLoader variant="text" className="w-1/2" />
            </div>
          ))
        ) : items.length > 0 ? (
          items.map((anime) => <AnimeCard key={anime.id} anime={anime} />)
        ) : (
          <div className="py-6 text-xs text-slate-500 italic">
            Belum ada anime untuk kategori ini.
          </div>
        )}
      </div>
    </section>
  );
};
