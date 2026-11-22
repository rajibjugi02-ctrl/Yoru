import {
  WatchHistoryItem,
  WatchlistItem,
  UserPreferences,
  UserProfile,
} from "@/types";

const STORAGE_KEYS = {
  WATCH_HISTORY: "yoru_watch_history",
  WATCHLIST: "yoru_watchlist",
  USER_PREFERENCES: "yoru_user_preferences",
  USER_PROFILE: "yoru_user_profile",
} as const;

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultQuality: "auto",
  autoPlayNext: true,
  autoSkipIntro: true,
  audioPreference: "sub",
  subtitleLanguage: "id",
  subtitleSize: "md",
  ambientMode: true,
  elasticPullToRefresh: true,
  reducedMotion: false,
  apiServerUrl: "https://api.consumet.org/anime/gogoanime",
};

export const DEFAULT_PROFILE: UserProfile = {
  name: "Pengembara Malam",
  avatarUrl:
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80",
  rank: "Penonton Baru",
  updatedAt: 0,
};

/**
 * Helper to dispatch cross-component storage update events
 */
export function notifyStorageUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("yoru-storage-update"));
  }
}

/* ==========================================================================
   User Profile Persistence
   ========================================================================== */

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: Partial<UserProfile>) {
  if (typeof window === "undefined") return;
  try {
    const current = getUserProfile();
    const updated: UserProfile = {
      ...current,
      ...profile,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    notifyStorageUpdate();
  } catch (err) {
    console.error("Failed to save user profile:", err);
  }
}

/* ==========================================================================
   Watch History (Continue Watching)
   ========================================================================== */

export function getWatchHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchProgress(item: Omit<WatchHistoryItem, "updatedAt">) {
  if (typeof window === "undefined") return;
  try {
    const history = getWatchHistory();
    const existingIndex = history.findIndex(
      (h) => String(h.animeId) === String(item.animeId)
    );

    const updatedItem: WatchHistoryItem = {
      ...item,
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      history[existingIndex] = updatedItem;
    } else {
      history.unshift(updatedItem);
    }

    // Keep up to 50 items
    const trimmed = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(trimmed));
    notifyStorageUpdate();
  } catch (err) {
    console.error("Failed to save watch progress to localStorage:", err);
  }
}

export function removeWatchHistory(animeId: number | string) {
  if (typeof window === "undefined") return;
  try {
    const history = getWatchHistory().filter(
      (h) => String(h.animeId) !== String(animeId)
    );
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(history));
    notifyStorageUpdate();
  } catch (err) {
    console.error("Failed to remove watch history:", err);
  }
}

export function clearWatchHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
    notifyStorageUpdate();
  } catch (err) {
    console.error("Failed to clear watch history:", err);
  }
}

/* ==========================================================================
   My List / Watchlist
   ========================================================================== */

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToWatchlist(item: Omit<WatchlistItem, "addedAt">) {
  if (typeof window === "undefined") return;
  try {
    const list = getWatchlist();
    const existingIndex = list.findIndex(
      (w) => String(w.animeId) === String(item.animeId)
    );

    const newItem: WatchlistItem = {
      ...item,
      addedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = newItem;
    } else {
      list.unshift(newItem);
    }

    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
    notifyStorageUpdate();
  } catch (err) {
    console.error("Failed to add to watchlist:", err);
  }
}

export function removeFromWatchlist(animeId: number | string) {
  if (typeof window === "undefined") return;
  try {
    const list = getWatchlist().filter(
      (w) => String(w.animeId) !== String(animeId)
    );
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
    notifyStorageUpdate();
  } catch (err) {
    console.error("Failed to remove from watchlist:", err);
  }
}

export function isAnimeInWatchlist(animeId: number | string): boolean {
  if (typeof window === "undefined") return false;
  return getWatchlist().some((w) => String(w.animeId) === String(animeId));
}

/* ==========================================================================
   User Preferences
   ========================================================================== */

export function getUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveUserPreferences(prefs: Partial<UserPreferences>) {
  if (typeof window === "undefined") return;
  try {
    const current = getUserPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
    notifyStorageUpdate();
  } catch (err) {
    console.error("Failed to save user preferences:", err);
  }
}

export function resetUserPreferences() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEYS.USER_PREFERENCES,
      JSON.stringify(DEFAULT_PREFERENCES)
    );
    notifyStorageUpdate();
  } catch (err) {
    console.error("Failed to reset preferences:", err);
  }
}

/* ==========================================================================
   Data Export / Import (Backup & Restore)
   ========================================================================== */

export function exportBackupData(): string {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    userProfile: getUserProfile(),
    watchHistory: getWatchHistory(),
    watchlist: getWatchlist(),
    userPreferences: getUserPreferences(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== "object") return false;

    if (data.userProfile && typeof data.userProfile === "object") {
      localStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify({ ...DEFAULT_PROFILE, ...data.userProfile })
      );
    }
    if (Array.isArray(data.watchHistory)) {
      localStorage.setItem(
        STORAGE_KEYS.WATCH_HISTORY,
        JSON.stringify(data.watchHistory)
      );
    }
    if (Array.isArray(data.watchlist)) {
      localStorage.setItem(
        STORAGE_KEYS.WATCHLIST,
        JSON.stringify(data.watchlist)
      );
    }
    if (data.userPreferences && typeof data.userPreferences === "object") {
      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify({ ...DEFAULT_PREFERENCES, ...data.userPreferences })
      );
    }

    notifyStorageUpdate();
    return true;
  } catch (err) {
    console.error("Failed to import backup data:", err);
    return false;
  }
}
