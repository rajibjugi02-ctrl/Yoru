"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface SearchContextType {
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openSearch = () => {
    if (!pathname.startsWith("/search")) {
      router.push("/search");
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("yoru:focus-search"));
    }, 50);
  };

  const closeSearch = () => setIsSearchOpen(false);
  const toggleSearch = () => {
    if (!pathname.startsWith("/search")) {
      router.push("/search");
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("yoru:focus-search"));
    }, 50);
  };

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!pathname.startsWith("/search")) {
          router.push("/search");
        }
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("yoru:focus-search"));
        }, 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router]);

  return (
    <SearchContext.Provider
      value={{ isSearchOpen, openSearch, closeSearch, toggleSearch }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};
