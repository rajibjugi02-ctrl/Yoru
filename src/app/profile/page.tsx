"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Settings,
  Flame,
  Film,
  Bookmark,
  CheckCircle2,
  Play,
  Edit2,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  History,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useUserProfile, useWatchHistory, useWatchlist } from "@/hooks/useStorage";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80",
];

type ProfileTab = "watching" | "history" | "watchlist";

export default function ProfilePage() {
  const { profile, updateProfile, isHydrated: profileHydrated } = useUserProfile();
  const { history, isHydrated: historyHydrated } = useWatchHistory();
  const { watchlist, isHydrated: watchlistHydrated } = useWatchlist();

  const [activeTab, setActiveTab] = useState<ProfileTab>("watching");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Calculate statistics
  const totalEpisodesWatched = history.length;
  const totalWatchSeconds = history.reduce((acc, h) => acc + h.currentTime, 0);
  const totalWatchHours = (totalWatchSeconds / 3600).toFixed(1);
  const completedCount = watchlist.filter((w) => w.status === "completed").length;

  const getUserRank = (hours: number) => {
    if (hours < 5) return { title: "Penonton Baru", color: "text-slate-300" };
    if (hours < 25) return { title: "Anime Enthusiast", color: "text-indigo-400" };
    if (hours < 100) return { title: "Otaku Terampil", color: "text-amber-400" };
    return { title: "Otaku Veteran Mahaguru", color: "text-purple-400" };
  };

  const userRank = getUserRank(parseFloat(totalWatchHours));

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateProfile({ name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  const handleSelectAvatar = (url: string) => {
    updateProfile({ avatarUrl: url });
    setShowAvatarPicker(false);
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Top Header: Title & Settings Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-white flex items-center gap-2.5">
            <User className="w-7 h-7 text-indigo-400" /> Profil
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Aktivitas menonton dan identitas personal penonton Yoru.
          </p>
        </div>

        {/* Liquid Glass Settings Button */}
        <Link
          href="/settings"
          prefetch={true}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-xs font-semibold text-slate-200 hover:text-white transition-all backdrop-blur-xl shadow-lg group active:scale-95"
          title="Buka Pengaturan"
        >
          <Settings className="w-4 h-4 text-indigo-400 group-hover:rotate-45 transition-transform duration-300" />
          <span className="hidden sm:inline">Pengaturan</span>
        </Link>
      </div>

      {/* Identity Card & User Statistics */}
      <GlassCard variant="elevated" className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar with Customization Trigger */}
          <div className="relative w-24 h-24 rounded-full p-1 border-2 border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.35)] shrink-0 group cursor-pointer">
            <div
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="relative w-full h-full rounded-full overflow-hidden bg-slate-900"
            >
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                fill
                sizes="96px"
                className="object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Edit2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={profile.name}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    autoFocus
                    className="px-3 py-1 rounded-xl bg-white/10 border border-white/20 text-white text-base font-semibold focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold font-heading text-white">
                    {profile.name}
                  </h2>
                  <button
                    onClick={() => {
                      setTempName(profile.name);
                      setIsEditingName(true);
                    }}
                    className="p-1 text-slate-500 hover:text-white transition-colors"
                    title="Ubah Nama"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <span
                className={`px-3 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.05] border border-white/10 ${userRank.color}`}
              >
                {userRank.title}
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-lg">
              Statistik dan preferensi anime Anda tersimpan aman secara offline pada perangkat ini.
            </p>
          </div>
        </div>

        {/* Avatar Preset Selector Dropdown */}
        {showAvatarPicker && (
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.1] space-y-2 animate-fade-in">
            <span className="text-xs font-semibold text-slate-300 block">
              Pilih Avatar Karakter Anime:
            </span>
            <div className="flex flex-wrap gap-3">
              {AVATAR_PRESETS.map((avatar, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAvatar(avatar)}
                  className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-transform ${profile.avatarUrl === avatar
                      ? "border-indigo-500 scale-110 shadow-lg"
                      : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                >
                  <Image src={avatar} alt="Preset" fill sizes="48px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4 Statistics Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.08]">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <div className="text-xl md:text-2xl font-bold font-heading text-white tabular-nums">
              {totalEpisodesWatched}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <Film className="w-3 h-3 text-indigo-400" /> Episode
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <div className="text-xl md:text-2xl font-bold font-heading text-white tabular-nums">
              {totalWatchHours}j
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <Flame className="w-3 h-3 text-amber-400" /> Waktu Nonton
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <div className="text-xl md:text-2xl font-bold font-heading text-white tabular-nums">
              {watchlist.length}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <Bookmark className="w-3 h-3 text-indigo-400" /> Pustaka
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <div className="text-xl md:text-2xl font-bold font-heading text-white tabular-nums">
              {completedCount}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Selesai
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Main Profile Tabs (Sedang Ditonton, Riwayat, Pustaka) */}
      <div className="space-y-6">
        {/* Tab Headers */}
        <div className="flex gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("watching")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${activeTab === "watching"
                ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            Sedang Ditonton ({history.filter((h) => h.progressPercent < 90).length})
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${activeTab === "history"
                ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
          >
            <History className="w-4 h-4 text-indigo-400" />
            Riwayat Tontonan ({history.length})
          </button>

          <button
            onClick={() => setActiveTab("watchlist")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${activeTab === "watchlist"
                ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
          >
            <Bookmark className="w-4 h-4 text-indigo-400" />
            Pustaka Saya ({watchlist.length})
          </button>
        </div>

        {/* Tab 1: Sedang Ditonton (Continue Watching) */}
        {activeTab === "watching" && (
          <div>
            {history.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {history.map((item) => (
                  <GlassCard
                    key={item.animeId}
                    variant="interactive"
                    className="p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="flex gap-3">
                      <Link
                        href={`/watch/${item.animeId}/${item.episodeNumber}`}
                        prefetch={true}
                        className="relative aspect-video w-24 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0"
                      >
                        {item.coverImage && (
                          <Image
                            src={item.coverImage}
                            alt={item.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/anime/${item.animeId}`}
                          prefetch={true}
                          className="text-xs font-semibold text-white truncate block hover:text-indigo-300"
                        >
                          {item.title}
                        </Link>
                        <span className="text-[11px] text-indigo-400 font-medium block mt-0.5">
                          Episode {item.episodeNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Selesai: {Math.round(item.progressPercent)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & CTA */}
                    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(5, item.progressPercent))}%`,
                          }}
                        />
                      </div>
                      <Link
                        href={`/watch/${item.animeId}/${item.episodeNumber}`}
                        prefetch={true}
                      >
                        <GlassButton size="sm" variant="primary" className="w-full">
                          Lanjut Menonton
                        </GlassButton>
                      </Link>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <Clock className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-base font-semibold text-white">
                  Belum ada anime yang sedang ditonton
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Mulai tonton episode favorit Anda dan riwayat akan muncul secara otomatis.
                </p>
                <Link href="/" prefetch={true}>
                  <GlassButton variant="primary" size="md">
                    Cari Anime Sekarang
                  </GlassButton>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Riwayat Tontonan */}
        {activeTab === "history" && (
          <div>
            {history.length > 0 ? (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.animeId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 aspect-video rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                        {item.coverImage && (
                          <Image
                            src={item.coverImage}
                            alt={item.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/anime/${item.animeId}`}
                          prefetch={true}
                          className="text-xs font-semibold text-white hover:text-indigo-300 truncate block"
                        >
                          {item.title}
                        </Link>
                        <span className="text-[11px] text-indigo-400">
                          Episode {item.episodeNumber} • {Math.round(item.progressPercent)}% selesai
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/watch/${item.animeId}/${item.episodeNumber}`}
                      prefetch={true}
                    >
                      <GlassButton size="sm" variant="secondary">
                        Putar
                      </GlassButton>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-2">
                <History className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-base font-semibold text-white">
                  Riwayat masih kosong
                </h3>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Pustaka / Watchlist Preview */}
        {activeTab === "watchlist" && (
          <div>
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {watchlist.map((item) => (
                  <Link
                    key={item.animeId}
                    href={`/anime/${item.animeId}`}
                    prefetch={true}
                    className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.2] overflow-hidden p-2.5 transition-all hover:-translate-y-1 block"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                      {item.coverImage && (
                        <Image
                          src={item.coverImage}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 140px, 180px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-indigo-300">
                        {item.title}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{item.format || "TV"}</span>
                        {item.averageScore && (
                          <span className="text-amber-400 font-semibold tabular-nums">
                            ⭐ {item.averageScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <Bookmark className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-base font-semibold text-white">
                  Belum ada anime di Pustaka
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tekan ikon bookmark pada poster anime untuk menyimpannya ke pustaka Anda.
                </p>
                <Link href="/" prefetch={true}>
                  <GlassButton variant="primary" size="md">
                    Jelajahi Anime
                  </GlassButton>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
