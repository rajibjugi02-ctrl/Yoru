export interface SeasonItem {
  id: string | number;
  slug: string;
  title: string;
  seasonLabel: string;
  seasonNumber: number;
  format?: string;
  poster?: string;
  episodes?: number | null;
  rawItem?: any;
}

export interface FranchiseGroup<T = any> {
  baseTitle: string;
  coverImage?: string;
  totalSeasons: number;
  seasons: SeasonItem[];
  primaryItem: T;
}

/**
 * Remove redundant sub/format metadata
 */
export function cleanRawTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  return rawTitle
    .replace(/\s*Subtitle\s+Indonesia/gi, "")
    .replace(/\s*Sub\s+Indo/gi, "")
    .replace(/\(Episode\s*\d+\s*[–-]\s*\d+\)/gi, "")
    .replace(/\(Episode\s*\d+\)/gi, "")
    .replace(/\[\s*Episode\s*\d+\s*[–-]\s*\d+\s*\]/gi, "")
    .replace(/\b(?:BD|TV|Batch|Complete)\b/gi, "")
    .replace(/\(\s*(?:BD|TV|Batch)\s*\)/gi, "")
    .replace(/\[\s*(?:BD|TV|Batch)\s*\]/gi, "")
    .replace(/\(\s*\)/g, "")
    .trim();
}

/**
 * Detect season information (label, order number) from title and slug
 */
export function detectSeason(
  rawTitle: string,
  slug?: string
): { seasonLabel: string; seasonNumber: number; cleanTitle: string } {
  const cleanTitle = cleanRawTitle(rawTitle);
  const s = (slug || "").toLowerCase();
  const lower = cleanTitle.toLowerCase();

  let seasonNumber = 1;
  let seasonLabel = "Season 1";

  // 1. Movie / Prequel "0" (e.g. Jujutsu Kaisen 0)
  if (/\b0\b/i.test(cleanTitle) && (lower.includes("movie") || lower.includes("gekijouban") || s.includes("movie") || s.includes("-0-"))) {
    return {
      seasonLabel: "Movie 0 (Prequel)",
      seasonNumber: 0,
      cleanTitle,
    };
  }

  // 2. Explicit "Season X"
  const seasonMatch = cleanTitle.match(/Season\s*(\d+)/i);
  if (seasonMatch) {
    const num = parseInt(seasonMatch[1], 10);
    seasonNumber = num;
    seasonLabel = `Season ${num}`;

    // Check for Part / Cour
    const partMatch = cleanTitle.match(/(?:Part|Cour)\s*(\d+)/i);
    if (partMatch) {
      seasonLabel += ` Part ${partMatch[1]}`;
      seasonNumber += parseFloat(`0.${partMatch[1]}`);
    }
    return { seasonLabel, seasonNumber, cleanTitle };
  }

  // 3. Ordinal "2nd Season", "3rd Season", etc.
  const ordinalMatch = cleanTitle.match(/(\d+)(?:st|nd|rd|th)\s*Season/i);
  if (ordinalMatch) {
    const num = parseInt(ordinalMatch[1], 10);
    seasonNumber = num;
    seasonLabel = `Season ${num}`;
    return { seasonLabel, seasonNumber, cleanTitle };
  }

  // 4. "S2", "S3", etc. in slug or title
  const sNumSlugMatch = s.match(/-s(\d+)(?:-|$)/i) || s.match(/season-(\d+)(?:-|$)/i);
  if (sNumSlugMatch) {
    const num = parseInt(sNumSlugMatch[1], 10);
    seasonNumber = num;
    seasonLabel = `Season ${num}`;
    return { seasonLabel, seasonNumber, cleanTitle };
  }

  // 5. Final Season
  if (/final\s*season/i.test(cleanTitle) || /the\s*final/i.test(cleanTitle) || /final/i.test(s)) {
    seasonNumber = 90;
    seasonLabel = "Final Season";
    const partMatch = cleanTitle.match(/(?:Part|Cour)\s*(\d+)/i);
    if (partMatch) {
      seasonLabel += ` Part ${partMatch[1]}`;
      seasonNumber += parseFloat(`0.${partMatch[1]}`);
    }
    return { seasonLabel, seasonNumber, cleanTitle };
  }

  // 6. Movie
  if (/\b(?:Movie|Gekijouban)\b/i.test(cleanTitle) || /movie/i.test(s)) {
    return {
      seasonLabel: "Movie",
      seasonNumber: 100,
      cleanTitle,
    };
  }

  // 7. OVA / Special
  if (/\b(?:OVA|OAD|Special)\b/i.test(cleanTitle) || /ova/i.test(s)) {
    return {
      seasonLabel: "OVA / Special",
      seasonNumber: 101,
      cleanTitle,
    };
  }

  // 8. Specific sub-arcs after colon (e.g. Kimetsu no Yaiba: Hashira Geiko-hen)
  if (cleanTitle.includes(":") && !/^(Re:Zero|Steins;Gate)/i.test(cleanTitle)) {
    const arc = cleanTitle.split(":")[1]?.trim();
    if (arc) {
      const cleanArc = arc.replace(/-hen$/i, "").trim();
      return {
        seasonLabel: cleanArc,
        seasonNumber: 1, // Will be resolved during group sorting if multiple exist
        cleanTitle,
      };
    }
  }

  return { seasonLabel, seasonNumber, cleanTitle };
}

/**
 * Extract clean base franchise title
 */
export function extractBaseTitle(rawTitle: string, slug?: string): string {
  const clean = cleanRawTitle(rawTitle);

  // Preserve prefixes like "Re:Zero"
  let workingTitle = clean;

  // Remove season tags
  workingTitle = workingTitle
    .replace(/\s*Season\s*\d+/gi, "")
    .replace(/\s*\d+(?:st|nd|rd|th)\s*Season/gi, "")
    .replace(/\s*The\s*Final\s*Season/gi, "")
    .replace(/\s*Final\s*Season/gi, "")
    .replace(/\s*(?:Part|Cour)\s*\d+/gi, "")
    .replace(/\s*Movie(?:\s*\d+)?/gi, "")
    .replace(/\s*Gekijouban/gi, "")
    .replace(/\s*OVA/gi, "")
    .trim();

  // If there's an arc subtitle separated by colon (unless it's Re:Zero)
  if (workingTitle.includes(":") && !/^re:zero/i.test(workingTitle)) {
    const parts = workingTitle.split(":");
    if (parts[0] && parts[0].trim().length >= 3) {
      workingTitle = parts[0].trim();
    }
  }

  // If title has trailing hyphen, clean it
  workingTitle = workingTitle.replace(/[-–—]\s*$/, "").trim();

  return workingTitle || clean;
}

/**
 * Group list of anime by franchise
 */
export function groupAnimeByFranchise<T extends { title?: any; slug?: string; id?: any; coverImage?: any }>(
  items: T[]
): FranchiseGroup<T>[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const groupMap = new Map<string, FranchiseGroup<T>>();

  items.forEach((item) => {
    const rawTitle =
      typeof item.title === "string"
        ? item.title
        : item.title?.romaji || item.title?.english || item.title?.userPreferred || "";
    const slug = String(item.slug || item.id || "");
    const baseTitle = extractBaseTitle(rawTitle, slug);
    const normalizedKey = baseTitle.toLowerCase().replace(/[^a-z0-9]/g, "");

    const { seasonLabel, seasonNumber } = detectSeason(rawTitle, slug);

    const cover =
      typeof item.coverImage === "string"
        ? item.coverImage
        : item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "";

    const seasonItem: SeasonItem = {
      id: item.id || slug,
      slug,
      title: rawTitle,
      seasonLabel,
      seasonNumber,
      poster: cover,
      rawItem: item,
    };

    if (!groupMap.has(normalizedKey)) {
      groupMap.set(normalizedKey, {
        baseTitle,
        coverImage: cover,
        totalSeasons: 1,
        seasons: [seasonItem],
        primaryItem: item,
      });
    } else {
      const group = groupMap.get(normalizedKey)!;
      // Prevent duplicate slug within same franchise
      if (!group.seasons.some((s) => s.slug === slug)) {
        group.seasons.push(seasonItem);
        group.totalSeasons = group.seasons.length;
      }
    }
  });

  // Sort seasons inside each group by seasonNumber ascending (S1, S2, S3... Movie, OVA)
  const result: FranchiseGroup<T>[] = [];

  groupMap.forEach((group) => {
    group.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

    // Pick Season 1 or first season as primary card representation
    const s1 = group.seasons.find((s) => s.seasonNumber === 1) || group.seasons[0];
    if (s1 && s1.rawItem) {
      group.primaryItem = s1.rawItem;
      if (s1.poster) group.coverImage = s1.poster;
    }

    result.push(group);
  });

  return result;
}
