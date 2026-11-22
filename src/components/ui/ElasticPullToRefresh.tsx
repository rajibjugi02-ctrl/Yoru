"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Loader2, ArrowDown, Sparkles } from "lucide-react";
import { useUserSettings } from "@/hooks/useStorage";

interface ElasticPullToRefreshProps {
  onRefresh?: () => Promise<void> | void;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 75;
const MAX_PULL = 130;

export const ElasticPullToRefresh: React.FC<ElasticPullToRefreshProps> = ({
  onRefresh,
  children,
}) => {
  const { settings } = useUserSettings();
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasCrossedThreshold, setHasCrossedThreshold] = useState(false);

  const startYRef = useRef(0);
  const currentPullRef = useRef(0);

  // Spring physics for rubber band resistance
  const pullY = useSpring(0, {
    stiffness: 380,
    damping: 32,
    mass: 0.8,
  });

  const spinnerRotate = useTransform(pullY, [0, PULL_THRESHOLD], [0, 360]);
  const indicatorOpacity = useTransform(pullY, [15, 45], [0, 1]);
  const indicatorScale = useTransform(pullY, [15, PULL_THRESHOLD], [0.75, 1]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // Only trigger if at the very top of the window
      if (window.scrollY <= 2 && settings.elasticPullToRefresh && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    },
    [settings.elasticPullToRefresh, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const rawDiff = currentY - startYRef.current;

      // Only pull down
      if (rawDiff > 0 && window.scrollY <= 2) {
        // Elastic logarithmic dampening formula
        const dampened = Math.min(
          MAX_PULL,
          Math.pow(rawDiff, 0.85) * 1.8
        );
        currentPullRef.current = dampened;
        pullY.set(dampened);

        if (dampened >= PULL_THRESHOLD && !hasCrossedThreshold) {
          setHasCrossedThreshold(true);
          // Optional subtle haptic click if supported
          if (typeof window !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(12);
            } catch {}
          }
        } else if (dampened < PULL_THRESHOLD && hasCrossedThreshold) {
          setHasCrossedThreshold(false);
        }
      } else {
        pullY.set(0);
        currentPullRef.current = 0;
      }
    },
    [isPulling, isRefreshing, hasCrossedThreshold, pullY]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (currentPullRef.current >= PULL_THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      pullY.set(55); // Hold in refreshing position

      try {
        await onRefresh();
      } catch (err) {
        console.warn("Pull to refresh error:", err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setHasCrossedThreshold(false);
          pullY.set(0);
        }, 500);
      }
    } else {
      setHasCrossedThreshold(false);
      pullY.set(0);
    }
    currentPullRef.current = 0;
  }, [isPulling, onRefresh, pullY]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div className="relative">
      {/* Liquid Glass Pull Indicator */}
      <motion.div
        style={{
          y: pullY,
          opacity: indicatorOpacity,
          scale: indicatorScale,
        }}
        className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center justify-center"
      >
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0F1117]/90 border border-white/[0.18] backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-xs text-slate-200">
          {/* Top specular highlight */}
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {isRefreshing ? (
            <>
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="font-medium text-white">Menyegarkan data...</span>
            </>
          ) : hasCrossedThreshold ? (
            <>
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="font-semibold text-white">Lepaskan untuk memuat ulang</span>
            </>
          ) : (
            <>
              <motion.div style={{ rotate: spinnerRotate }}>
                <ArrowDown className="w-4 h-4 text-indigo-400" />
              </motion.div>
              <span className="text-slate-400">Tarik ke bawah...</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Content wrapper with elastic rubber-band pull translation */}
      <motion.div style={{ y: pullY }}>{children}</motion.div>
    </div>
  );
};
