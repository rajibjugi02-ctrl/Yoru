"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Tv,
  Sparkles,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Volume2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useUserSettings, useWatchHistory } from "@/hooks/useStorage";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings, exportData, importData } =
    useUserSettings();
  const { clearAll: clearHistory } = useWatchHistory();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportBackup = () => {
    try {
      const dataStr = exportData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yoru-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Data backup berhasil diekspor!");
    } catch {
      showToast("Gagal mengekspor data backup.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importData(content);
      if (success) {
        showToast("Data backup berhasil dipulihkan!");
      } else {
        showToast("Format file backup tidak valid.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 md:right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600/90 border border-indigo-400/40 text-white text-xs font-semibold shadow-2xl backdrop-blur-2xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          {toastMessage}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/profile"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Profil
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-white flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-indigo-400" /> Pengaturan Yoru
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Sesuaikan preferensi pemutar video, tampilan, dan pengelolaan cadangan data.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Card 1: Preferensi Pemutar Video */}
        <GlassCard variant="default" className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
            <Tv className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                Preferensi Pemutar Video
              </h3>
              <p className="text-xs text-slate-400">
                Pengaturan standar saat memutar tayangan anime
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Resolusi Video Default */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Resolusi Video Default
                </div>
                <div className="text-[11px] text-slate-400">
                  Kualitas awal saat memulai pemutaran HLS
                </div>
              </div>

              <div className="flex gap-1.5">
                {(["auto", "1080p", "720p", "480p"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => updateSettings({ defaultQuality: q })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase transition-all border ${
                      settings.defaultQuality === q
                        ? "bg-indigo-600 text-white border-indigo-400/40 shadow-sm"
                        : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Play Next Episode */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Auto-Play Next Episode
                </div>
                <div className="text-[11px] text-slate-400">
                  Otomatis memutar episode berikutnya saat episode ini selesai
                </div>
              </div>

              <button
                onClick={() =>
                  updateSettings({ autoPlayNext: !settings.autoPlayNext })
                }
                className={`relative w-12 h-6 rounded-full transition-colors border ${
                  settings.autoPlayNext
                    ? "bg-indigo-600 border-indigo-400/50"
                    : "bg-white/10 border-white/20"
                }`}
                aria-label="Toggle Auto-Play Next"
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.autoPlayNext ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Auto-Skip Intro/Outro */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Auto-Skip Lagu Pembuka &amp; Penutup
                </div>
                <div className="text-[11px] text-slate-400">
                  Lompati Opening dan Ending secara otomatis tanpa harus menekan tombol
                </div>
              </div>

              <button
                onClick={() =>
                  updateSettings({ autoSkipIntro: !settings.autoSkipIntro })
                }
                className={`relative w-12 h-6 rounded-full transition-colors border ${
                  settings.autoSkipIntro
                    ? "bg-indigo-600 border-indigo-400/50"
                    : "bg-white/10 border-white/20"
                }`}
                aria-label="Toggle Auto-Skip Intro"
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.autoSkipIntro ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Audio Preference */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Preferensi Audio
                </div>
                <div className="text-[11px] text-slate-400">
                  Bahasa suara utama (Sub Jepang / Dub)
                </div>
              </div>

              <div className="flex gap-1.5">
                {(["sub", "dub"] as const).map((audio) => (
                  <button
                    key={audio}
                    onClick={() => updateSettings({ audioPreference: audio })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase transition-all border ${
                      settings.audioPreference === audio
                        ? "bg-indigo-600 text-white border-indigo-400/40"
                        : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                    }`}
                  >
                    {audio === "sub" ? "Sub (JP)" : "Dub"}
                  </button>
                ))}
              </div>
            </div>

            {/* Bahasa Subtitle Default */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Bahasa Subtitle Default
                </div>
                <div className="text-[11px] text-slate-400">
                  Bahasa trek teks otomatis saat memutar video
                </div>
              </div>

              <div className="flex gap-1.5">
                {[
                  { id: "id", label: "Indonesia" },
                  { id: "en", label: "English" },
                  { id: "off", label: "Nonaktif" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      updateSettings({
                        subtitleLanguage: item.id as "id" | "en" | "off",
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      settings.subtitleLanguage === item.id
                        ? "bg-indigo-600 text-white border-indigo-400/40 shadow-sm"
                        : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Size */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Ukuran Teks Subtitle
                </div>
                <div className="text-[11px] text-slate-400">
                  Skala font subtitle VTT di pemutar video
                </div>
              </div>

              <div className="flex gap-1.5">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ subtitleSize: size })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      settings.subtitleSize === size
                        ? "bg-indigo-600 text-white border-indigo-400/40"
                        : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                    }`}
                  >
                    {size === "sm" ? "Kecil" : size === "md" ? "Sedang" : "Besar"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Card 2: Tampilan & Interaksi */}
        <GlassCard variant="default" className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                Tampilan &amp; Interaksi
              </h3>
              <p className="text-xs text-slate-400">
                Pendaran cahaya sinematik dan efek gestur sentuh
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Ambient Glow Mode */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Ambient Glow Mode
                </div>
                <div className="text-[11px] text-slate-400">
                  Pendaran cahaya lembut di belakang pemutar video yang dinamis
                </div>
              </div>

              <button
                onClick={() =>
                  updateSettings({ ambientMode: !settings.ambientMode })
                }
                className={`relative w-12 h-6 rounded-full transition-colors border ${
                  settings.ambientMode
                    ? "bg-indigo-600 border-indigo-400/50"
                    : "bg-white/10 border-white/20"
                }`}
                aria-label="Toggle Ambient Glow"
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.ambientMode ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Elastic Pull-to-Refresh */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Mobile Elastic Pull-to-Refresh
                </div>
                <div className="text-[11px] text-slate-400">
                  Gestur tarik ke bawah dengan animasi pegas karet ala iOS di mobile
                </div>
              </div>

              <button
                onClick={() =>
                  updateSettings({
                    elasticPullToRefresh: !settings.elasticPullToRefresh,
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors border ${
                  settings.elasticPullToRefresh
                    ? "bg-indigo-600 border-indigo-400/50"
                    : "bg-white/10 border-white/20"
                }`}
                aria-label="Toggle Pull to Refresh"
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.elasticPullToRefresh ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="text-xs font-semibold text-white">
                  Mode Reduced Motion
                </div>
                <div className="text-[11px] text-slate-400">
                  Kurangi efek transisi berat untuk performa lebih ringan dan hemat baterai
                </div>
              </div>

              <button
                onClick={() =>
                  updateSettings({
                    reducedMotion: !settings.reducedMotion,
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors border ${
                  settings.reducedMotion
                    ? "bg-indigo-600 border-indigo-400/50"
                    : "bg-white/10 border-white/20"
                }`}
                aria-label="Toggle Reduced Motion"
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.reducedMotion ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Card 3: Server & Manajemen Data */}
        <GlassCard variant="default" className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                Server &amp; Manajemen Data
              </h3>
              <p className="text-xs text-slate-400">
                Penyimpanan lokal aman tanpa pelacakan data pribadi
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Backup & Restore */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div>
                <div className="text-xs font-semibold text-white">
                  Backup &amp; Restore Berkas JSON
                </div>
                <div className="text-[11px] text-slate-400">
                  Simpan seluruh daftar tontonan, riwayat, dan preferensi Anda ke file .json atau pulihkan dari cadangan lama.
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <GlassButton
                  size="sm"
                  variant="secondary"
                  leftIcon={<Download className="w-3.5 h-3.5 text-indigo-400" />}
                  onClick={handleExportBackup}
                >
                  Ekspor Backup (.json)
                </GlassButton>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <GlassButton
                  size="sm"
                  variant="secondary"
                  leftIcon={<Upload className="w-3.5 h-3.5 text-indigo-400" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Impor Backup (.json)
                </GlassButton>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="p-4 rounded-2xl bg-rose-500/[0.03] border border-rose-500/20 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" /> Zona Reset
              </div>

              <div className="flex flex-wrap gap-2.5">
                <GlassButton
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => {
                    if (
                      confirm("Apakah Anda yakin ingin menghapus seluruh riwayat tontonan?")
                    ) {
                      clearHistory();
                      showToast("Riwayat tontonan berhasil dibersihkan.");
                    }
                  }}
                >
                  Hapus Semua Riwayat
                </GlassButton>

                <GlassButton
                  size="sm"
                  variant="ghost"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => {
                    if (
                      confirm("Kembalikan seluruh pengaturan ke konfigurasi awal?")
                    ) {
                      resetSettings();
                      showToast("Pengaturan telah direset ke default.");
                    }
                  }}
                >
                  Reset Preferensi ke Default
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
