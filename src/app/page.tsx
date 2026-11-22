import React from "react";
import {
  getTrendingAnime,
  getOngoingAnime,
  getTopRatedAnime,
  getMovieAnime,
} from "@/services/anilist";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { AnimeRow } from "@/components/home/AnimeRow";

export const revalidate = 3600; // ISR cache for 1 hour

export default async function HomePage() {
  // Fetch real data from AniList in parallel
  const [trending, ongoing, topRated, movies] = await Promise.all([
    getTrendingAnime(1, 12),
    getOngoingAnime(1, 12),
    getTopRatedAnime(1, 12),
    getMovieAnime(1, 12),
  ]);

  // Combine top trending & ongoing for the cinematic hero carousel
  const heroItems = trending.length > 0 ? trending.slice(0, 5) : ongoing.slice(0, 5);

  return (
    <div className="space-y-10 md:space-y-14">
      {/* Cinematic Hero Carousel */}
      <HeroCarousel items={heroItems} />

      {/* Continue Watching Row (from localStorage) */}
      <ContinueWatchingRow />

      {/* Curated Row: Sedang Tayang (Ongoing) */}
      <AnimeRow
        title="Sedang Tayang Minggu Ini"
        subtitle="Episode terbaru anime ongoing yang rilis musim ini"
        iconName="flame"
        items={ongoing}
        viewAllHref="/schedule"
      />

      {/* Curated Row: Trending Sekarang */}
      <AnimeRow
        title="Trending Terpopuler"
        subtitle="Anime yang paling banyak dibicarakan dan ditonton saat ini"
        iconName="sparkles"
        items={trending}
        viewAllHref="/explore?sort=TRENDING_DESC"
      />

      {/* Curated Row: Top Rated */}
      <AnimeRow
        title="Skor Tertinggi Sepanjang Masa"
        subtitle="Karya anime mahakarya dengan penilaian tertinggi komunitas global"
        iconName="trophy"
        items={topRated}
        viewAllHref="/explore?sort=SCORE_DESC"
      />

      {/* Curated Row: Film Anime (Movies) */}
      <AnimeRow
        title="Film Anime Pilihan"
        subtitle="Sinema anime berdurasi penuh berkualitas visual spektakuler"
        iconName="film"
        items={movies}
        viewAllHref="/explore?format=MOVIE"
      />
    </div>
  );
}
