"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Play,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { getAiringSchedule } from "@/services/anilist";
import { ScheduleItem } from "@/types";

const DAYS_OF_WEEK = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export default function SchedulePage() {
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => new Date().getDay());
  const [allSchedules, setAllSchedules] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadSchedule() {
      setIsLoading(true);
      try {
        const data = await getAiringSchedule();
        if (mounted) setAllSchedules(data);
      } catch (err) {
        console.error("Error loading schedule:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadSchedule();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedDayName = DAYS_OF_WEEK[selectedDayIndex];

  const currentDaySchedules = useMemo(() => {
    return allSchedules.filter(
      (s) => s.day?.toLowerCase() === selectedDayName.toLowerCase()
    );
  }, [allSchedules, selectedDayName]);

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-white flex items-center gap-2.5">
          <Calendar className="w-7 h-7 text-indigo-400" /> Jadwal Rilis Anime
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-0.5">
          Kalender penayangan episode anime ongoing mingguan diperbarui secara realtime dari Otakudesu.
        </p>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {DAYS_OF_WEEK.map((day, idx) => {
          const isToday = new Date().getDay() === idx;
          const isSelected = selectedDayIndex === idx;

          return (
            <button
              key={day}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                  : "bg-white/[0.04] text-slate-300 hover:text-white border-white/[0.08] hover:bg-white/[0.08]"
              }`}
            >
              <span>{day}</span>
              {isToday && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 animate-pulse"
              />
            ))}
          </div>
        ) : currentDaySchedules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentDaySchedules.map((item) => {
              const media = item.media;
              const title =
                media.title.english ||
                media.title.romaji ||
                media.title.userPreferred ||
                "Anime";
              const cover =
                media.coverImage?.large || media.coverImage?.medium || "";

              return (
                <Link
                  key={item.id}
                  href={`/anime/${media.id}`}
                  className="group block rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.18] p-3 transition-all duration-200"
                >
                  <div className="flex gap-3">
                    <div className="relative aspect-[2/3] w-16 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-indigo-950/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {item.day || "Ongoing"}
                          </span>
                        </div>
                        <h3 className="text-xs md:text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/[0.04]">
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <Sparkles className="w-3 h-3" /> Subtitle Indonesia
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <GlassCard className="p-12 text-center text-slate-400 space-y-2">
            <Clock className="w-8 h-8 text-indigo-400/60 mx-auto" />
            <p className="text-sm font-medium text-slate-200">
              Tidak ada jadwal rilis untuk hari {selectedDayName}
            </p>
            <p className="text-xs text-slate-500">
              Pilih hari lain di atas untuk melihat kalender anime ongoing.
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
