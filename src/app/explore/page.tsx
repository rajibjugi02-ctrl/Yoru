"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Compass,
  Filter,
  Search,
  Radio,
  CheckCircle2,
  Loader2,
  X,
  Layers,
  ChevronDown,
} from "lucide-react";
import { AnimeCard } from "@/components/home/AnimeCard";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { fetchCatalog } from "@/services/anilist";
import { AnimeItem } from "@/types";
import { cn } from "@/lib/utils";

const GENRES: { name: string; slug: string }[] = [
  { name: "Action", slug: "action" },
  { name: "Adventure", slug: "adventure" },
  { name: "Comedy", slug: "comedy" },
  { name: "Drama", slug: "drama" },
  { name: "Fantasy", slug: "fantasy" },
  { name: "Horror", slug: "horror" },
  { name: "Isekai", slug: "isekai" },
  { name: "Mystery", slug: "mystery" },
  { name: "Psychological", slug: "psychological" },
  { name: "Romance", slug: "romance" },
  { name: "Sci-Fi", slug: "sci-fi" },
  { name: "Shounen", slug: "shounen" },
  { name: "Slice of Life", slug: "slice-of-life" },
  { name: "Supernatural", slug: "supernatural" },
  { name: "Thriller", slug: "thriller" },
];

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const initialGenre = searchParams.get("genre") || "";
  const initialCat = (searchParams.get("category") as "ongoing" | "completed") || "ongoing";

  const [query, setQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [category, setCategory] = useState<"ongoing" | "completed">(initialCat);

  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Sync state if query params change externally
  useEffect(() => {
    if (initialQuery !== query) setQuery(initialQuery);
    if (initialGenre !== selectedGenre) setSelectedGenre(initialGenre);
    if (initialCat && initialCat !== category) setCategory(initialCat);
  }, [initialQuery, initialGenre, initialCat]);

  // Load Initial Page when filters change
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadData() {
      setIsLoadingInitial(true);
      setPage(1);

      try {
        const result = await fetchCatalog({
          category,
          genre: selectedGenre,
          query: query.trim(),
          page: 1,
        });

        if (active) {
          setAnimeList(result.animeList);
          setHasNextPage(result.pagination.hasNextPage);
        }
      } catch (err) {
        if (active) {
          console.error("Error loading anime catalog:", err);
        }
      } finally {
        if (active) {
          setIsLoadingInitial(false);
        }
      }
    }

    const timer = setTimeout(loadData, 300);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, selectedGenre, category]);

  // Handle Load More (Pagination)
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasNextPage) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const result = await fetchCatalog({
        category,
        genre: selectedGenre,
        query: query.trim(),
        page: nextPage,
      });

      if (result.animeList.length > 0) {
        setAnimeList((prev) => {
          // Avoid duplicate slugs if any overlap exists
          const existingIds = new Set(prev.map((a) => a.id));
          const newItems = result.animeList.filter((a) => !existingIds.has(a.id));
          return [...prev, ...newItems];
        });
        setPage(nextPage);
        setHasNextPage(result.pagination.hasNextPage);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      console.error("Error loading more anime:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNextPage, page, category, selectedGenre, query]);

  const handleSelectGenre = (slug: string) => {
    if (selectedGenre === slug) {
      setSelectedGenre("");
    } else {
      setSelectedGenre(slug);
    }
  };

  const isSearchActive = Boolean(query.trim());

  return (
    <div className="space-y-8 pb-32 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-white flex items-center gap-2.5">
          <Compass className="w-7 h-7 text-indigo-400" /> Eksplorasi Katalog Anime
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Jelajahi ribuan anime sub Indo lengkap, filter genre langsung dari database, serta telusuri anime tamat dan sedang tayang.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul anime (misal: Jujutsu Kaisen, Naruto, Bleach)..."
          className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition-colors shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
            title="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Tabs: Sedang Tayang (Ongoing) vs Sudah Tamat (Completed) */}
      {!isSearchActive && !selectedGenre && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Kategori Katalog
          </div>
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => setCategory("ongoing")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200",
                category === "ongoing"
                  ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Radio className={cn("w-3.5 h-3.5", category === "ongoing" && "animate-pulse text-red-400")} />
              <span>Sedang Tayang (Ongoing)</span>
            </button>
            <button
              onClick={() => setCategory("completed")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200",
                category === "completed"
                  ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sudah Tamat (Completed)</span>
            </button>
          </div>
        </div>
      )}

      {/* Genre Filter Chips */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Filter Berdasarkan Genre (API Langsung)
          </div>
          {selectedGenre && (
            <button
              onClick={() => setSelectedGenre("")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset Genre
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGenre("")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
              selectedGenre === ""
                ? "bg-indigo-600 text-white border-indigo-400/50 shadow-md shadow-indigo-600/20 font-semibold"
                : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20"
            )}
          >
            Semua Genre
          </button>
          {GENRES.map((g) => {
            const isSelected = selectedGenre === g.slug;
            return (
              <button
                key={g.slug}
                onClick={() => handleSelectGenre(g.slug)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-400/50 shadow-md shadow-indigo-600/20 font-semibold"
                    : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20"
                )}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 border-b border-white/[0.08] pb-3">
        <span>
          Menampilkan{" "}
          <span className="text-white font-semibold tabular-nums">
            {animeList.length}
          </span>{" "}
          anime
          {isSearchActive && ` untuk pencarian "${query}"`}
          {selectedGenre && ` dalam genre "${GENRES.find((g) => g.slug === selectedGenre)?.name || selectedGenre}"`}
          {!isSearchActive && !selectedGenre && (category === "ongoing" ? " (Sedang Tayang)" : " (Sudah Tamat)")}
        </span>
        {page > 1 && (
          <span className="text-slate-500">
            Halaman 1 – {page}
          </span>
        )}
      </div>

      {/* Grid List */}
      {isLoadingInitial ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonLoader variant="card" />
              <SkeletonLoader variant="text" className="w-4/5" />
              <SkeletonLoader variant="text" className="w-1/2" />
            </div>
          ))}
        </div>
      ) : animeList.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>

          {/* Load More Button or Finished State */}
          <div className="pt-4 flex flex-col items-center justify-center gap-2">
            {hasNextPage ? (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className={cn(
                  "px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 border border-indigo-400/30",
                  isLoadingMore && "opacity-80 cursor-not-allowed"
                )}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memuat halaman {page + 1}...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Muat Lebih Banyak</span>
                  </>
                )}
              </button>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Semua anime telah dimuat ({animeList.length} judul)
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <p className="text-base text-slate-300 font-medium">
            Tidak ada anime yang ditemukan
          </p>
          <p className="text-xs text-slate-500">
            Coba pilih genre lain atau periksa kata kunci pencarian Anda.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 py-8">
          <SkeletonLoader variant="text" className="h-8 w-48" />
          <SkeletonLoader variant="text" className="h-12 w-full max-w-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLoader key={i} variant="card" />
            ))}
          </div>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
