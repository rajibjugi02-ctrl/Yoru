"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Star, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { AnimeItem } from "@/types";

interface HeroCarouselProps {
  items: AnimeItem[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const validItems = items.slice(0, 5);

  useEffect(() => {
    if (validItems.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validItems.length);
    }, 6500);

    return () => clearInterval(interval);
  }, [validItems.length, isPaused]);

  if (validItems.length === 0) return null;

  const currentAnime = validItems[currentIndex];
  const title =
    currentAnime.title.english ||
    currentAnime.title.romaji ||
    currentAnime.title.userPreferred ||
    "Anime";
  const banner =
    currentAnime.bannerImage || currentAnime.coverImage?.extraLarge || "";
  const score = currentAnime.averageScore
    ? (currentAnime.averageScore / 10).toFixed(1)
    : null;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ position: "relative", width: "100%", minHeight: "420px", overflow: "hidden" }}
      className="relative w-full h-[400px] sm:h-[460px] md:h-[520px] rounded-3xl overflow-hidden border border-white/[0.12] bg-[#0F1117] shadow-[0_20px_60px_rgba(0,0,0,0.8)] select-none"
    >
      {/* Specular top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent z-20" />

      {/* Background Banner Crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAnime.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0 }}
          className="absolute inset-0"
        >
          {banner ? (
            <Image
              src={banner}
              alt={title}
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center" }}
              className="object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-950 to-slate-900" />
          )}

          {/* Deep Cinematic Gradients into #08090C */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#08090C] via-[#08090C]/80 to-transparent w-full md:w-3/4" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08090C]/40 via-transparent to-[#08090C]" />
        </motion.div>
      </AnimatePresence>

      {/* Content Container */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-10 md:p-12 max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAnime.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 backdrop-blur-xl">
                {currentAnime.format || "TV Series"}
              </span>
              {score && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-xl tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {score}
                </span>
              )}
              {currentAnime.seasonYear && (
                <span className="text-xs text-slate-300 font-medium">
                  {currentAnime.seasonYear}
                </span>
              )}
              {currentAnime.duration && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" /> {currentAnime.duration}m
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold font-heading text-white tracking-tight leading-[1.1] drop-shadow-lg line-clamp-2">
              {title}
            </h2>

            {/* Synopsis Snippet */}
            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 sm:line-clamp-3 leading-relaxed font-light max-w-xl">
              {currentAnime.description?.replace(/<[^>]*>?/gm, "") ||
                "Nikmati kisah spektakuler dalam anime berkualitas tinggi bebas iklan di Yoru."}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href={`/watch/${currentAnime.id}/1`} prefetch={true}>
                <GlassButton
                  variant="primary"
                  size="lg"
                  leftIcon={<Play className="w-4 h-4 fill-white" />}
                >
                  Tonton Sekarang
                </GlassButton>
              </Link>

              <Link href={`/anime/${currentAnime.id}`} prefetch={true}>
                <GlassButton
                  variant="secondary"
                  size="lg"
                  leftIcon={<Info className="w-4 h-4" />}
                >
                  Detail Anime
                </GlassButton>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls & Pagination Indicators */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
        {/* Indicators */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
          {validItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-6 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Previous / Next buttons */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() =>
              setCurrentIndex(
                (prev) => (prev - 1 + validItems.length) % validItems.length
              )
            }
            className="p-2 rounded-full bg-black/40 hover:bg-white/10 border border-white/10 text-white transition-colors backdrop-blur-md"
            aria-label="Slide sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev + 1) % validItems.length)
            }
            className="p-2 rounded-full bg-black/40 hover:bg-white/10 border border-white/10 text-white transition-colors backdrop-blur-md"
            aria-label="Slide berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
