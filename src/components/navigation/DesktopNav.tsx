"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Compass,
  Calendar,
  Bookmark,
  Search,
  User,
  Moon,
  Home,
} from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/schedule", label: "Jadwal", icon: Calendar },
  { href: "/explore", label: "Eksplorasi", icon: Compass },
  { href: "/library", label: "Pustaka", icon: Bookmark },
];

export const DesktopNav: React.FC = () => {
  const pathname = usePathname();
  const { openSearch } = useSearch();
  const [scrolled, setScrolled] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.userAgent.toUpperCase().indexOf("MAC") >= 0);

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-4 inset-x-0 z-50 hidden md:flex justify-center px-4 pointer-events-none">
      <nav
        className={cn(
          "pointer-events-auto flex items-center gap-1.5 p-1.5 px-3 rounded-full border transition-all duration-300",
          "bg-[#0F1117]/80 border-white/[0.12] backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.45)]",
          scrolled && "bg-[#08090C]/90 border-white/[0.16] shadow-[0_20px_45px_rgba(0,0,0,0.65)]"
        )}
      >
        {/* Specular top highlight */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* Logo */}
        <Link
          href="/"
          prefetch={true}
          className="flex items-center gap-2 pl-2 pr-3 py-1 group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_22px_rgba(99,102,241,0.8)] transition-all">
            <Moon className="w-3.5 h-3.5 fill-white text-transparent group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <span className="font-heading font-extrabold text-base tracking-tight text-white flex items-center gap-1">
            YORU
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.1] mx-1" />

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                className={cn(
                  "relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors select-none",
                  isActive
                    ? "text-white"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-nav-active-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-white/[0.12] border border-white/[0.16] shadow-sm"
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.1] mx-1" />

        {/* Search Button (links to /search, shortcut Ctrl + K) */}
        <Link
          href="/search"
          prefetch={true}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all group cursor-pointer",
            pathname.startsWith("/search")
              ? "bg-white/[0.14] border-white/[0.2] text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              : "bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] hover:border-white/[0.18] text-slate-300 hover:text-white"
          )}
          title="Buka halaman pencarian (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="hidden lg:inline text-slate-400 group-hover:text-slate-200">
            Cari...
          </span>
          <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/[0.08] border border-white/[0.12] rounded">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </Link>

        {/* Profile Avatar */}
        <Link
          href="/profile"
          prefetch={true}
          className={cn(
            "relative p-1 rounded-full transition-transform active:scale-95 ml-0.5",
            pathname === "/profile" || pathname === "/settings"
              ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#08090C]"
              : "hover:ring-1 hover:ring-white/30"
          )}
          title="Profil & Pengaturan"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-700 via-indigo-900 to-indigo-600 flex items-center justify-center text-white border border-white/20">
            <User className="w-3.5 h-3.5 text-slate-200" />
          </div>
        </Link>
      </nav>
    </header>
  );
};
