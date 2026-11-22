"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Calendar,
  Search,
  Bookmark,
  User,
} from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import { cn } from "@/lib/utils";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      key: "home",
      label: "Beranda",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      key: "schedule",
      label: "Jadwal",
      href: "/schedule",
      icon: Calendar,
      isActive: pathname.startsWith("/schedule"),
    },
    {
      key: "search",
      label: "Search",
      href: "/search",
      icon: Search,
      isActive: pathname.startsWith("/search"),
    },
    {
      key: "library",
      label: "Pustaka",
      href: "/library",
      icon: Bookmark,
      isActive: pathname.startsWith("/library"),
    },
    {
      key: "profile",
      label: "Profile",
      href: "/profile",
      icon: User,
      isActive: pathname.startsWith("/profile") || pathname.startsWith("/settings"),
    },
  ];

  return (
    <nav className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-50 md:hidden pointer-events-none pb-[safe-area-inset-bottom]">
      <div className="pointer-events-auto relative flex items-center justify-between p-1.5 rounded-full bg-[#0F1117]/85 border border-white/[0.14] backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
        {/* Specular top highlight */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={true}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-2 transition-all duration-200 select-none",
                item.isActive ? "text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {/* Shared Layout Active Indicator Pill */}
              {item.isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-1 rounded-full bg-white/[0.12] border border-white/[0.18] shadow-sm -z-0"
                />
              )}

              <Icon
                className={cn(
                  "w-5 h-5 relative z-10 transition-transform duration-200",
                  item.isActive && "text-indigo-400 scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px] tracking-tight mt-0.5 relative z-10",
                  item.isActive ? "text-white" : "text-slate-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
