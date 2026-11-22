"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive" | "subtle";
  glowEffect?: boolean;
  glowColor?: string;
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  className,
  variant = "default",
  glowEffect = false,
  glowColor = "rgba(99, 102, 241, 0.15)",
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-white/[0.04] border-white/[0.1] shadow-2xl backdrop-blur-2xl",
    elevated:
      "bg-[#0F1117]/75 border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-3xl",
    interactive:
      "bg-white/[0.04] border-white/[0.1] hover:border-white/[0.22] hover:bg-white/[0.07] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 cursor-pointer backdrop-blur-2xl active:scale-[0.99]",
    subtle: "bg-white/[0.02] border-white/[0.06] backdrop-blur-xl shadow-lg",
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border text-slate-100 overflow-hidden",
        variantStyles[variant],
        className
      )}
      style={{
        boxShadow: glowEffect
          ? `0 0 35px -5px ${glowColor}, inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`
          : undefined,
      }}
      {...props}
    >
      {/* Specular Top Border Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
};
