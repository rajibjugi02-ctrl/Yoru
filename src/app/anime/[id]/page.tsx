import React from "react";
import Link from "next/link";
import { getAnimeDetails } from "@/services/anilist";
import { AnimeDetailView } from "@/components/anime/AnimeDetailView";
import { Film, ArrowLeft, Search, RefreshCw, Compass } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const anime = await getAnimeDetails(id);

  if (!anime) {
    return {
      title: "Anime Tidak Ditemukan - Yoru",
    };
  }

  const title =
    anime.title.english ||
    anime.title.romaji ||
    anime.title.userPreferred ||
    "Anime";

  return {
    title: `${title} - Yoru Streaming Bebas Iklan`,
    description:
      anime.description?.replace(/<[^>]*>?/gm, "").slice(0, 160) ||
      `Tonton ${title} tanpa iklan di Yoru.`,
  };
}

export default async function AnimeDetailPage({ params }: Props) {
  const { id } = await params;
  const cleanId = decodeURIComponent(id).replace(/^\/+|\/+$/g, "");
  const anime = await getAnimeDetails(cleanId);

  if (!anime) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="relative z-10 max-w-md w-full p-8 rounded-3xl bg-[#0F1117]/80 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <Film className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold font-heading text-white">
              Detail Anime Belum Tersedia
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Slug <span className="font-mono text-indigo-400 font-semibold">{cleanId}</span> tidak ditemukan pada database penyedia saat ini. Coba telusuri judul lain atau jelajahi katalog anime Yoru.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Beranda
            </Link>

            <Link
              href="/explore"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Compass className="w-3.5 h-3.5" /> Eksplorasi Anime
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AnimeDetailView anime={anime} />;
}
