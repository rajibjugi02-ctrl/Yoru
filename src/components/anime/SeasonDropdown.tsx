"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Layers, Play, Sparkles } from "lucide-react";
import { SeasonItem } from "@/lib/season-utils";
import { cn } from "@/lib/utils";

interface SeasonDropdownProps {
  seasons?: SeasonItem[];
  currentSlug?: string;
  animeTitle?: string;
  target?: "detail" | "watch";
  variant?: "pill" | "card" | "header";
  className?: string;
  onSelectSeason?: (season: SeasonItem) => void;
}

export const SeasonDropdown: React.FC<SeasonDropdownProps> = ({
  seasons: initialSeasons,
  currentSlug = "",
  animeTitle = "",
  target = "detail",
  variant = "pill",
  className = "",
  onSelectSeason,
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [seasons, setSeasons] = useState<SeasonItem[]>(initialSeasons || []);
  const [isLoading, setIsLoading] = useState(!initialSeasons && !!(animeTitle || currentSlug));
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-fetch seasons if not provided
  useEffect(() => {
    if (initialSeasons && initialSeasons.length > 0) {
      setSeasons(initialSeasons);
      return;
    }

    if (!animeTitle && !currentSlug) return;

    let mounted = true;
    async function loadSeasons() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (animeTitle) queryParams.set("title", animeTitle);
        if (currentSlug) queryParams.set("slug", currentSlug);

        const res = await fetch(`/api/anime/seasons?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.seasons && Array.isArray(json.seasons)) {
            setSeasons(json.seasons);
          }
        }
      } catch (err) {
        console.warn("Failed to load seasons:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadSeasons();
    return () => {
      mounted = false;
    };
  }, [initialSeasons, animeTitle, currentSlug]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // If there's 1 or 0 season and not loading, don't show the switcher on detail/watch pages
  if (!isLoading && seasons.length <= 1) {
    return null;
  }

  const currentSeason =
    seasons.find((s) => s.slug === currentSlug) ||
    seasons.find((s) => currentSlug.toLowerCase().includes(s.slug.toLowerCase())) ||
    seasons[0];

  const handleChoose = (season: SeasonItem) => {
    setIsOpen(false);
    if (onSelectSeason) {
      onSelectSeason(season);
      return;
    }
    if (target === "watch") {
      router.push(`/watch/${encodeURIComponent(season.slug)}/1`);
    } else {
      router.push(`/anime/${encodeURIComponent(season.slug)}`);
    }
  };

  if (variant === "card") {
    // Compact pill inside Search Grid Cards
    return (
      <div ref={containerRef} className={cn("relative z-20", className)}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black/90 border border-white/20 text-[11px] font-semibold text-white backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>{seasons.length} Season</span>
          <ChevronDown
            className={cn(
              "w-3 h-3 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 bottom-full mb-1.5 w-48 rounded-xl bg-[#0F1117]/95 border border-white/20 p-1.5 shadow-2xl backdrop-blur-3xl z-50 space-y-1 max-h-56 overflow-y-auto custom-scrollbar"
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 px-2 py-1 flex items-center justify-between border-b border-white/10">
                <span>Pilih Season</span>
                <span className="font-mono text-[9px] text-slate-400">
                  {seasons.length} Tersedia
                </span>
              </div>

              {seasons.map((s) => {
                const isSelected = s.slug === currentSlug;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChoose(s);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left group cursor-pointer",
                      isSelected
                        ? "bg-indigo-600 text-white font-semibold shadow-sm"
                        : "text-slate-200 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <Play className="w-2.5 h-2.5 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{s.seasonLabel}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-white" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Header / Detail / Watch Page Variant (Liquid Glass Pill)
  return (
    <div ref={containerRef} className={cn("relative inline-block z-30", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-md cursor-pointer",
          "bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.14] text-slate-200 hover:text-white backdrop-blur-xl",
          isOpen && "ring-2 ring-indigo-500/50 bg-white/[0.12] border-indigo-400/40 text-white"
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>
          {isLoading
            ? "Memuat Season..."
            : `${currentSeason?.seasonLabel || "Pilihan Season"} (${seasons.length} Season)`}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-[#0F1117]/95 border border-white/20 p-2 shadow-2xl backdrop-blur-3xl z-50 space-y-1 max-h-72 overflow-y-auto custom-scrollbar"
          >
            <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 px-2.5 py-1.5 flex items-center justify-between border-b border-white/10">
              <span>Semua Season & Cerita</span>
              <span className="font-mono text-[9px] text-emerald-400">
                {seasons.length} Season
              </span>
            </div>

            {seasons.map((s) => {
              const isSelected = s.slug === currentSlug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => handleChoose(s)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left group cursor-pointer",
                    isSelected
                      ? "bg-indigo-600 text-white font-semibold shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border",
                        isSelected
                          ? "bg-white/20 border-white/30 text-white"
                          : "bg-white/[0.05] border-white/10 text-indigo-400 group-hover:border-indigo-400/40"
                      )}
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.seasonLabel}</p>
                      {s.title && s.title !== s.seasonLabel && (
                        <p className="text-[10px] text-slate-400 truncate opacity-80 group-hover:opacity-100">
                          {s.title}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 shrink-0 ml-1.5 text-white" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
