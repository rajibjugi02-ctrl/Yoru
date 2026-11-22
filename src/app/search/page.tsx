"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Clock,
  Trash2,
  Sparkles,
  Flame,
  Layers,
  Star,
  Film,
  Play,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SeasonDropdown } from "@/components/anime/SeasonDropdown";
import { searchAnime } from "@/services/anilist";
import {
  groupAnimeByFranchise,
  FranchiseGroup,
  cleanRawTitle,
} from "@/lib/season-utils";
import { AnimeItem } from "@/types";
import { cn } from "@/lib/utils";

const MAX_HISTORY = 6;
const SEARCH_HISTORY_KEY = "yoru_search_history";

const POPULAR_SEARCHES = [
  "Jujutsu Kaisen",
  "Kimetsu no Yaiba",
  "One Piece",
  "Solo Leveling",
  "Bleach",
  "Attack on Titan",
  "Chainsaw Man",
  "Spy x Family",
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [franchiseGroups, setFranchiseGroups] = useState<FranchiseGroup<AnimeItem>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, MAX_HISTORY));
      }
    } catch {}
  }, []);

  const saveHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;

    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
        0,
        MAX_HISTORY
      );
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeHistoryItem = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const next = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearAllHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {}
  };

  // Execute search API call
  const performSearch = useCallback(
    async (searchTerm: string) => {
      const clean = searchTerm.trim();
      if (!clean) {
        setResults([]);
        setFranchiseGroups([]);
        setIsLoading(false);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const list = await searchAnime(clean, undefined, 1, 40);
        setResults(list);
        const groups = groupAnimeByFranchise(list);
        setFranchiseGroups(groups);
        saveHistory(clean);
      } catch (err) {
        console.warn("Search failed:", err);
        setResults([]);
        setFranchiseGroups([]);
      } finally {
        setIsLoading(false);
      }
    },
    [saveHistory]
  );

  // Sync with URL query on first mount or back/forward navigation
  useEffect(() => {
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      performSearch(urlQuery);
    } else if (urlQuery && !hasSearched) {
      performSearch(urlQuery);
    }
  }, [urlQuery, performSearch, hasSearched, query]);

  // Handle typing with 400ms debounce
  const handleInputChange = (val: string) => {
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setFranchiseGroups([]);
      setHasSearched(false);
      router.replace("/search", { scroll: false });
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      router.replace(`/search?q=${encodeURIComponent(val.trim())}`, { scroll: false });
      performSearch(val);
    }, 400);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setFranchiseGroups([]);
    setHasSearched(false);
    router.replace("/search", { scroll: false });
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (query.trim()) {
      router.replace(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false });
      performSearch(query);
    }
  };

  const handleSelectKeyword = (keyword: string) => {
    setQuery(keyword);
    router.replace(`/search?q=${encodeURIComponent(keyword)}`, { scroll: false });
    performSearch(keyword);
    inputRef.current?.focus();
  };

  // Keyboard shortcut listener for focusing search input
  useEffect(() => {
    const handleFocusSearch = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener("yoru:focus-search", handleFocusSearch);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleFocusSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("yoru:focus-search", handleFocusSearch);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-32 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      {/* Search Header & Ambient Hero Bar */}
      <div className="relative max-w-3xl mx-auto space-y-4">
        {/* Glow ambient background behind search bar */}
        <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/25 via-purple-500/20 to-sky-500/20 blur-xl opacity-75" />

        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="relative flex items-center w-full rounded-2xl bg-[#0F1117]/90 border border-white/20 shadow-2xl backdrop-blur-2xl transition-all focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/30">
            {/* Search Icon / Loading Spinner */}
            <div className="pl-4 pr-2 text-indigo-400 shrink-0">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </div>

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Cari anime, season, atau movie (misal: Jujutsu Kaisen)..."
              autoFocus
              className="w-full py-4 pl-1 pr-12 text-sm md:text-base text-white placeholder-slate-400 bg-transparent focus:outline-none"
            />

            {/* Clear Button */}
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Search History & Popular Suggestions (Shown when query is empty or no search executed) */}
        {!query && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pt-2"
          >
            {/* Recent Searches */}
            {history.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Pencarian Terakhir
                  </span>
                  <button
                    type="button"
                    onClick={clearAllHistory}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus Semua
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {history.map((item) => (
                    <div
                      key={item}
                      onClick={() => handleSelectKeyword(item)}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-indigo-400/30 text-xs text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-md"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={(e) => removeHistoryItem(item, e)}
                        className="opacity-60 hover:opacity-100 hover:text-rose-400 transition-opacity"
                        title="Hapus item ini"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div className="space-y-2 pt-2">
              <div className="text-xs text-slate-400 px-1 flex items-center gap-1.5 font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Anime Populer
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((popular) => (
                  <button
                    key={popular}
                    type="button"
                    onClick={() => handleSelectKeyword(popular)}
                    className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-indigo-600/20 border border-white/[0.08] hover:border-indigo-500/40 text-xs text-slate-300 hover:text-indigo-200 transition-all cursor-pointer"
                  >
                    {popular}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          {/* Result Stats Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/[0.08] pb-3">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {isLoading ? (
                "Mencari anime..."
              ) : (
                <>
                  Ditemukan{" "}
                  <strong className="text-white font-mono">{franchiseGroups.length}</strong>{" "}
                  franchise anime untuk{" "}
                  <strong className="text-indigo-300">"{query}"</strong>
                </>
              )}
            </span>
          </div>

          {/* Skeleton Shimmer Loading State */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden animate-pulse flex flex-col aspect-[2/3]"
                >
                  <div className="w-full h-full bg-slate-800/50" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && franchiseGroups.length === 0 && (
            <GlassCard
              variant="elevated"
              className="p-8 md:p-12 text-center max-w-lg mx-auto space-y-4 rounded-3xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold font-heading text-white">
                  Anime Tidak Ditemukan
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tidak ada hasil untuk kata kunci{" "}
                  <strong className="text-slate-200">"{query}"</strong>. Coba periksa ejaan
                  atau gunakan nama anime dalam bahasa Jepang / Inggris.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-2">
                {POPULAR_SEARCHES.slice(0, 4).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelectKeyword(item)}
                    className="px-3 py-1 rounded-full text-xs bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Franchise Grid View */}
          {!isLoading && franchiseGroups.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5"
            >
              {franchiseGroups.map((group) => {
                const primary = group.primaryItem;
                const cover =
                  group.coverImage ||
                  primary.coverImage?.extraLarge ||
                  primary.coverImage?.large ||
                  "";
                const displayTitle = group.baseTitle || cleanRawTitle(primary.title?.romaji || "");
                const primarySlug = String(primary.slug || primary.id);
                const hasMultipleSeasons = group.totalSeasons > 1;

                return (
                  <div
                    key={group.baseTitle + primarySlug}
                    className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900 border border-white/[0.1] hover:border-white/[0.22] shadow-lg transition-all duration-200 hover:-translate-y-1"
                  >
                    {/* Poster Container */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={displayTitle}
                          fill
                          unoptimized={true}
                          referrerPolicy="no-referrer"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                          No Poster
                        </div>
                      )}

                      {/* Dark overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                      {/* Top Badges */}
                      <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
                        {primary.format && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-black/70 text-white/90 border border-white/10 backdrop-blur-md">
                            {primary.format}
                          </span>
                        )}

                        {/* Multiple Season Badge & Dropdown inside Card */}
                        {hasMultipleSeasons && (
                          <div className="pointer-events-auto">
                            <SeasonDropdown
                              seasons={group.seasons}
                              currentSlug={primarySlug}
                              target="detail"
                              variant="card"
                            />
                          </div>
                        )}
                      </div>

                      {/* Direct Link Overlay to Anime Detail */}
                      <Link
                        href={`/anime/${encodeURIComponent(primarySlug)}`}
                        prefetch={true}
                        className="absolute inset-0 z-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title={`Lihat detail ${displayTitle}`}
                      >
                        <div className="w-11 h-11 rounded-full bg-indigo-600/90 border border-indigo-400/50 backdrop-blur-md flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.7)] group-hover:scale-105 transition-transform">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </Link>
                    </div>

                    {/* Card Body & Title */}
                    <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between bg-[#0F1117]/60">
                      <div>
                        <Link
                          href={`/anime/${encodeURIComponent(primarySlug)}`}
                          prefetch={true}
                          className="font-bold text-xs sm:text-sm text-white line-clamp-2 hover:text-indigo-400 transition-colors"
                        >
                          {displayTitle}
                        </Link>

                        {/* Season Count / Arc Info */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                          {hasMultipleSeasons ? (
                            <span className="text-indigo-400 font-medium flex items-center gap-1">
                              <Layers className="w-3 h-3" /> {group.totalSeasons} Season
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {primary.episodes ? `${primary.episodes} Eps` : "Lengkap"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Bottom Row */}
                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                        <Link
                          href={`/anime/${encodeURIComponent(primarySlug)}`}
                          prefetch={true}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>Tonton</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>

                        {hasMultipleSeasons && (
                          <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            Franchise
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-32 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Memuat halaman pencarian...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
