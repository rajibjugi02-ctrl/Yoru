"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Play,
  Bookmark,
  Check,
  Star,
  Clock,
  Sparkles,
  Calendar,
  Building,
  Film,
  Users,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimeCard } from "@/components/home/AnimeCard";
import { SeasonDropdown } from "@/components/anime/SeasonDropdown";
import { AnimeItem, StreamEpisodeItem } from "@/types";
import { useWatchlist, useWatchHistory } from "@/hooks/useStorage";
import { getAnimeEpisodes } from "@/services/stream";
import { cn } from "@/lib/utils";

interface AnimeDetailViewProps {
  anime: AnimeItem;
}

export const AnimeDetailView: React.FC<AnimeDetailViewProps> = ({ anime }) => {
  const [activeTab, setActiveTab] = useState<
    "episodes" | "relations" | "characters" | "recommendations"
  >("episodes");
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [episodes, setEpisodes] = useState<StreamEpisodeItem[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);

  const { isInList, addToList, removeFromList } = useWatchlist();
  const { history } = useWatchHistory();

  // Optimistic Watchlist state
  const isSavedInStorage = isInList(anime.id);
  const [optimisticSaved, setOptimisticSaved] = useState(isSavedInStorage);

  useEffect(() => {
    setOptimisticSaved(isSavedInStorage);
  }, [isSavedInStorage]);

  const watchProgress = history.find((h) => h.animeId === anime.id);

  const title =
    anime.title.english ||
    anime.title.romaji ||
    anime.title.userPreferred ||
    "Anime";
  const japaneseTitle = anime.title.native || anime.title.romaji || "";
  const banner = anime.bannerImage || anime.coverImage?.extraLarge || "";
  const cover =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    "";
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const studioName = anime.studios?.nodes?.[0]?.name;

  // Fetch episodes on mount
  useEffect(() => {
    let mounted = true;
    async function loadEpisodes() {
      // Prioritize direct Sanka episodeList from anime details
      if (anime.episodeList && anime.episodeList.length > 0) {
        setEpisodes(anime.episodeList);
        setLoadingEpisodes(false);
        return;
      }

      setLoadingEpisodes(true);
      try {
        const eps = await getAnimeEpisodes(title, anime.id, anime.episodes);
        if (mounted) {
          setEpisodes(eps);
        }
      } catch (err) {
        console.error("Error loading episodes:", err);
      } finally {
        if (mounted) setLoadingEpisodes(false);
      }
    }
    loadEpisodes();
    return () => {
      mounted = false;
    };
  }, [anime.id, anime.episodes, anime.episodeList, title]);

  const handleToggleWatchlist = () => {
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

  const cleanDescription =
    anime.description?.replace(/<[^>]*>?/gm, "") ||
    "Sinopsis belum tersedia untuk anime ini.";

  const nextEpisodeToWatch = watchProgress ? watchProgress.episodeNumber : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-8 pb-32"
    >
      {/* Top Floating Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          prefetch={true}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-xs font-semibold text-slate-200 hover:text-white transition-all backdrop-blur-xl shadow-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
        </Link>
      </div>

      {/* Full-Bleed Atmospheric Backdrop Banner */}
      <div className="relative w-full h-80 sm:h-96 md:h-[440px] rounded-3xl overflow-hidden bg-slate-900 border border-white/[0.12] shadow-2xl">
        {banner ? (
          <Image
            src={banner}
            alt={title}
            fill
            priority
            unoptimized={true}
            referrerPolicy="no-referrer"
            sizes="100vw"
            className="object-cover object-center opacity-45 blur-[1px]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-950 to-slate-900" />
        )}

        {/* Ambient Gradients into Deep Obsidian */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090C]/85 via-transparent to-transparent w-full md:w-2/3" />

        {/* Floating Top Tag */}
        <div className="absolute top-5 left-6 z-10 flex items-center gap-2">
          {anime.format && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-xl">
              {anime.format}
            </span>
          )}
          {anime.status && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-black/40 text-slate-300 border border-white/10 backdrop-blur-xl">
              {anime.status.replace("_", " ")}
            </span>
          )}
        </div>
      </div>

      {/* Main Glass Header Section */}
      <div className="relative z-10 -mt-28 md:-mt-40 px-2 md:px-4">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* HD Poster (Aspect 2:3) */}
          <div className="relative w-40 sm:w-52 md:w-60 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-white/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.85)] shrink-0">
            {cover && (
              <Image
                src={cover}
                alt={title}
                fill
                priority
                unoptimized={true}
                referrerPolicy="no-referrer"
                sizes="(max-width: 768px) 208px, 240px"
                className="object-cover"
              />
            )}
          </div>

          {/* Info & CTAs */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1.5">
                {score && (
                  <span className="flex items-center gap-1 font-semibold text-amber-400 tabular-nums bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {score} / 10
                  </span>
                )}
                {anime.seasonYear && (
                  <span className="flex items-center gap-1 bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/10">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    {anime.seasonYear}
                  </span>
                )}
                {studioName && (
                  <span className="flex items-center gap-1 bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/10">
                    <Building className="w-3 h-3 text-indigo-400" />
                    {studioName}
                  </span>
                )}
                {anime.episodes && (
                  <span className="flex items-center gap-1 bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/10 tabular-nums">
                    <Film className="w-3 h-3 text-indigo-400" />
                    {anime.episodes} Episode
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold font-heading text-white tracking-tight leading-tight">
                  {title}
                </h1>
                <SeasonDropdown
                  animeTitle={title}
                  currentSlug={String(anime.slug || anime.id)}
                  target="detail"
                  variant="header"
                />
              </div>

              {japaneseTitle && japaneseTitle !== title && (
                <p className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
                  {japaneseTitle}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href={`/watch/${anime.id}/${nextEpisodeToWatch}`} prefetch={true}>
                <GlassButton
                  variant="primary"
                  size="lg"
                  leftIcon={<Play className="w-4 h-4 fill-white" />}
                >
                  {watchProgress
                    ? `Lanjut Nonton Eps ${watchProgress.episodeNumber} (${Math.round(
                      watchProgress.progressPercent
                    )}%)`
                    : "Mulai Menonton (Eps 1)"}
                </GlassButton>
              </Link>

              <GlassButton
                variant={optimisticSaved ? "pill" : "secondary"}
                size="lg"
                leftIcon={
                  optimisticSaved ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )
                }
                onClick={handleToggleWatchlist}
              >
                {optimisticSaved ? "Tersimpan di Pustaka" : "Tambah ke Pustaka"}
              </GlassButton>
            </div>

            {/* Genre Tags */}
            {anime.genres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {anime.genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/explore?genre=${encodeURIComponent(genre)}`}
                    prefetch={true}
                    className="px-3 py-1 rounded-full text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            {/* Synopsis with Expand/Collapse */}
            <div className="space-y-1.5 pt-2">
              <p
                className={cn(
                  "text-xs md:text-sm text-slate-300 leading-relaxed font-light transition-all",
                  !isSynopsisExpanded && "line-clamp-3"
                )}
              >
                {cleanDescription}
              </p>
              {cleanDescription.length > 180 && (
                <button
                  onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {isSynopsisExpanded ? (
                    <>
                      Tutup Sinopsis <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Baca Selengkapnya <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Tabs Section */}
      <div className="space-y-6 pt-4">
        {/* Tab Headers */}
        <div className="flex gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("episodes")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap",
              activeTab === "episodes"
                ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            )}
          >
            <Film className="w-4 h-4 text-indigo-400" />
            Daftar Episode ({episodes.length || anime.episodes || "12"})
          </button>

          {anime.relations?.edges && anime.relations.edges.length > 0 && (
            <button
              onClick={() => setActiveTab("relations")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                activeTab === "relations"
                  ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              Relasi &amp; Watch Order ({anime.relations.edges.length})
            </button>
          )}

          {anime.characters?.edges && anime.characters.edges.length > 0 && (
            <button
              onClick={() => setActiveTab("characters")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                activeTab === "characters"
                  ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              Karakter &amp; Seiyuu
            </button>
          )}

          {anime.recommendations?.nodes && anime.recommendations.nodes.length > 0 && (
            <button
              onClick={() => setActiveTab("recommendations")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                activeTab === "recommendations"
                  ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Rekomendasi
            </button>
          )}
        </div>

        {/* Tab 1: Episodes */}
        {activeTab === "episodes" && (
          <div className="space-y-3">
            {loadingEpisodes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-3 animate-pulse"
                  />
                ))}
              </div>
            ) : episodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {episodes.map((ep) => {
                  const isCurrent =
                    watchProgress?.episodeNumber === ep.number;

                  return (
                    <Link
                      key={ep.id}
                      href={`/watch/${anime.id}/${ep.number}`}
                      prefetch={true}
                      className={cn(
                        "group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200",
                        isCurrent
                          ? "bg-indigo-600/15 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.18]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105",
                            isCurrent
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/50"
                              : "bg-white/[0.08] text-slate-300 group-hover:bg-indigo-600 group-hover:text-white"
                          )}
                        >
                          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs md:text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                            Episode {ep.number}
                          </h4>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {ep.title && ep.title !== `Episode ${ep.number}`
                              ? ep.title
                              : anime.duration
                                ? `${anime.duration} Menit`
                                : "Full HD"}
                          </span>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 shrink-0">
                          Sedang Ditonton
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Daftar episode belum tersedia.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Relations / Watch Order */}
        {activeTab === "relations" && anime.relations?.edges && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {anime.relations.edges.map((edge, idx) => {
              const rel = edge.node;
              const relTitle =
                rel.title.english ||
                rel.title.romaji ||
                rel.title.userPreferred ||
                "Anime";
              const relCover = rel.coverImage?.large || rel.coverImage?.medium;

              return (
                <Link
                  key={idx}
                  href={`/anime/${rel.id}`}
                  prefetch={true}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] transition-all group"
                >
                  <div className="relative w-14 aspect-[2/3] rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                    {relCover && (
                      <Image
                        src={relCover}
                        alt={relTitle}
                        fill
                        sizes="56px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-1">
                      {edge.relationType.replace("_", " ")}
                    </span>
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {relTitle}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{rel.format || "TV"}</span>
                      {rel.seasonYear && <span>• {rel.seasonYear}</span>}
                      {rel.averageScore && (
                        <span>
                          • ⭐ {(rel.averageScore / 10).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Tab 3: Characters & Seiyuu */}
        {activeTab === "characters" && anime.characters?.edges && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {anime.characters.edges.map((edge, idx) => {
              const char = edge.node;
              const va = edge.voiceActors?.[0];

              return (
                <GlassCard
                  key={idx}
                  variant="subtle"
                  className="p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                      {char.image?.medium && (
                        <Image
                          src={char.image.medium}
                          alt={char.name.full}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-semibold text-white truncate">
                        {char.name.full}
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        {edge.role}
                      </span>
                    </div>
                  </div>

                  {va && (
                    <div className="flex items-center gap-2 text-right shrink-0">
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium text-indigo-300 block truncate max-w-[80px]">
                          {va.name.full}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Seiyuu
                        </span>
                      </div>
                      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                        {va.image?.large && (
                          <Image
                            src={va.image.large}
                            alt={va.name.full}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Tab 4: Recommendations */}
        {activeTab === "recommendations" && anime.recommendations?.nodes && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {anime.recommendations.nodes.map((node, idx) => {
              const rec = node.mediaRecommendation;
              if (!rec) return null;

              const recAnime: AnimeItem = {
                id: rec.id,
                title: rec.title,
                coverImage: rec.coverImage,
                format: rec.format,
                averageScore: rec.averageScore,
                episodes: rec.episodes,
              };

              return <AnimeCard key={idx} anime={recAnime} />;
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};
