"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  Star,
  Loader2,
} from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import Link from "next/link";
import Image from "next/image";
import { searchAnime } from "@/services/anilist";
import { AnimeItem } from "@/types";

const TRENDING_SEARCHES = [
  "Solo Leveling Season 2",
  "Frieren: Beyond Journey's End",
  "Jujutsu Kaisen",
  "Demon Slayer: Hashira Training",
  "Chainsaw Man",
  "Oshi no Ko",
];

const GENRE_TAGS = [
  "Action",
  "Fantasy",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Supernatural",
  "Mystery",
];

export const QuickSearchModal: React.FC = () => {
  const { isSearchOpen, closeSearch } = useSearch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isSearchOpen]);

  // Debounced live search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await searchAnime(query, undefined, 1, 15);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchOpen) {
        closeSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, closeSearch]);

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 md:pt-24 px-4 pb-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSearch}
            className="fixed inset-0 bg-[#08090C]/85 backdrop-blur-2xl"
          />

          {/* Search Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative w-full max-w-2xl bg-[#0F1117]/95 border border-white/[0.14] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-3xl overflow-hidden z-10 flex flex-col max-h-[82vh]"
          >
            {/* Top specular reflection */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

            {/* Input Bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08]">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
              ) : (
                <Search className="w-5 h-5 text-indigo-400 shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari judul anime, studio, atau genre... (Esc untuk batal)"
                className="w-full bg-transparent text-white placeholder-slate-400 text-base md:text-lg focus:outline-none tracking-tight"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 rounded-full text-slate-400 hover:text-white bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-white/[0.06] border border-white/[0.1] rounded-md">
                ESC
              </kbd>
            </div>

            {/* Search Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar text-sm">
              {query.trim() ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Hasil pencarian untuk &quot;<span className="text-white font-medium">{query}</span>&quot;
                    </span>
                    <Link
                      href={`/explore?q=${encodeURIComponent(query)}`}
                      onClick={closeSearch}
                      className="text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Lihat semua <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {results.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {results.map((anime) => {
                        const title =
                          anime.title.english ||
                          anime.title.romaji ||
                          anime.title.userPreferred ||
                          "Anime";
                        const cover =
                          anime.coverImage?.large ||
                          anime.coverImage?.medium ||
                          "";

                        return (
                          <Link
                            key={anime.id}
                            href={`/anime/${anime.id}`}
                            onClick={closeSearch}
                            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/[0.14] transition-all group"
                          >
                            <div className="relative w-12 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                              {cover && (
                                <Image
                                  src={cover}
                                  alt={title}
                                  fill
                                  sizes="48px"
                                  className="object-cover group-hover:scale-105 transition-transform"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                                {title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                <span>{anime.format || "TV"}</span>
                                {anime.averageScore && anime.averageScore > 0 ? (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5 text-amber-400 font-semibold tabular-nums">
                                      <Star className="w-3 h-3 fill-amber-400" />
                                      {(anime.averageScore / 10).toFixed(1)}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-400 text-[10px]">
                                      {anime.status === "RELEASING" ? "Ongoing" : "Completed"}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {anime.genres?.slice(0, 2).join(", ")}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : !isLoading ? (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-slate-300 font-medium">
                        Tidak ditemukan hasil untuk &quot;{query}&quot;
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Coba gunakan kata kunci lain atau telusuri berdasarkan genre.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  {/* Genre Quick Filters */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Genre Populer
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {GENRE_TAGS.map((genre) => (
                        <Link
                          key={genre}
                          href={`/explore?genre=${encodeURIComponent(genre)}`}
                          onClick={closeSearch}
                          className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-indigo-500/20 hover:border-indigo-500/40 border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all"
                        >
                          {genre}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Trending Searches */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                      Sedang Tren
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TRENDING_SEARCHES.map((item, idx) => (
                        <button
                          key={item}
                          onClick={() => {
                            setQuery(item);
                          }}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-left text-slate-200 transition-colors group"
                        >
                          <span className="text-xs font-mono text-indigo-400 tabular-nums w-4">
                            0{idx + 1}
                          </span>
                          <span className="text-xs font-medium truncate flex-1 group-hover:text-white">
                            {item}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Helpful Hint */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Riwayat pencarian tersimpan otomatis di perangkatmu
                    </span>
                    <span className="hidden md:inline font-mono text-[10px]">
                      Yoru Liquid Glass v1.0
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
