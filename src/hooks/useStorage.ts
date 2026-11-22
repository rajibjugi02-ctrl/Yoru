"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getUserProfile,
  saveUserProfile,
  getWatchHistory,
  getWatchlist,
  getUserPreferences,
  saveWatchProgress,
  removeWatchHistory,
  clearWatchHistory,
  addToWatchlist,
  removeFromWatchlist,
  isAnimeInWatchlist,
  saveUserPreferences,
  resetUserPreferences,
  exportBackupData,
  importBackupData,
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
} from "@/services/storage";
import {
  WatchHistoryItem,
  WatchlistItem,
  UserPreferences,
  UserProfile,
} from "@/types";

/**
 * Reactive hook for User Profile (Name, Avatar, Rank) with Hydration Guard
 */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => {
    setProfile(getUserProfile());
  }, []);

  useEffect(() => {
    refresh();
    setIsHydrated(true);

    const handleUpdate = () => refresh();
    window.addEventListener("yoru-storage-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("yoru-storage-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  const updateProfile = useCallback(
    (newProfile: Partial<UserProfile>) => {
      if (!isHydrated) return;
      saveUserProfile(newProfile);
    },
    [isHydrated]
  );

  return {
    profile,
    isHydrated,
    updateProfile,
    refresh,
  };
}

/**
 * Reactive hook for Continue Watching / Watch History
 */
export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => {
    setHistory(getWatchHistory());
  }, []);

  useEffect(() => {
    refresh();
    setIsHydrated(true);

    const handleUpdate = () => refresh();
    window.addEventListener("yoru-storage-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("yoru-storage-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  return {
    history,
    isHydrated,
    isReady: isHydrated,
    saveProgress: saveWatchProgress,
    removeProgress: removeWatchHistory,
    clearAll: clearWatchHistory,
    refresh,
  };
}

/**
 * Reactive hook for My List / Watchlist
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => {
    setWatchlist(getWatchlist());
  }, []);

  useEffect(() => {
    refresh();
    setIsHydrated(true);

    const handleUpdate = () => refresh();
    window.addEventListener("yoru-storage-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("yoru-storage-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  const checkIsInList = useCallback((animeId: number | string) => {
    return isAnimeInWatchlist(animeId);
  }, []);

  return {
    watchlist,
    isHydrated,
    isReady: isHydrated,
    addToList: addToWatchlist,
    removeFromList: removeFromWatchlist,
    isInList: checkIsInList,
    refresh,
  };
}

/**
 * Reactive hook for User Settings & Preferences
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => {
    setSettings(getUserPreferences());
  }, []);

  useEffect(() => {
    refresh();
    setIsHydrated(true);

    const handleUpdate = () => refresh();
    window.addEventListener("yoru-storage-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("yoru-storage-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  const updateSettings = useCallback(
    (prefs: Partial<UserPreferences>) => {
      if (!isHydrated) return;
      saveUserPreferences(prefs);
    },
    [isHydrated]
  );

  return {
    settings,
    isHydrated,
    isReady: isHydrated,
    updateSettings,
    resetSettings: resetUserPreferences,
    exportData: exportBackupData,
    importData: importBackupData,
    refresh,
  };
}
