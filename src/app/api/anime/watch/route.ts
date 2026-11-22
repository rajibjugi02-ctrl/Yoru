import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const animeTitle = searchParams.get("animeTitle") || "";
  const episodeNumber = parseInt(searchParams.get("episodeNumber") || "1", 10);
  const server = searchParams.get("server") || "hd-1"; // hd-1, hd-2, megacloud
  const category = (searchParams.get("category") || "sub") as "sub" | "dub";
  const episodeIdParam = searchParams.get("episodeId") || "";

  const hostOrigin = req.nextUrl.origin;

  const sanitizedTitle = animeTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const episodeId =
    episodeIdParam.trim() || `${sanitizedTitle}-episode-${episodeNumber}`;

  // 1. Attempt extracting stream via aniwatch (HiAnime.Scraper)
  try {
    const { HiAnime } = await import("aniwatch");
    const hianime = new HiAnime.Scraper();

    // Map server parameter to HiAnime accepted values
    // hd-1 = VidStreaming, hd-2 = VidCloud, megacloud = MegaCloud
    const serverMap: Record<string, string> = {
      "hd-1": "hd-1",
      "hd-2": "hd-2",
      megacloud: "megacloud",
      vidstreaming: "hd-1",
      vidcloud: "hd-2",
    };
    const targetServer = serverMap[server.toLowerCase()] || "hd-1";

    console.log(`[aniwatch] Requesting stream for episodeId: "${episodeId}", server: "${targetServer}", category: "${category}"`);

    // Call getEpisodeSources with 5s timeout
    const sourcesData = await Promise.race([
      hianime.getEpisodeSources(
        episodeId,
        targetServer as any,
        category
      ),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("HiAnime timeout after 5000ms")), 5000)
      ),
    ]);

    if (sourcesData && sourcesData.sources && sourcesData.sources.length > 0) {
      const referer =
        (sourcesData.headers as Record<string, string>)?.Referer ||
        "https://megacloud.tv/";

      const proxiedSources = sourcesData.sources.map((s) => {
        const isHls = s.isM3U8 ?? s.url.includes(".m3u8");
        const finalUrl = isHls
          ? `${hostOrigin}/api/proxy/stream?url=${encodeURIComponent(
              s.url
            )}&referer=${encodeURIComponent(referer)}`
          : s.url;
        return {
          url: finalUrl,
          quality: s.quality || "Auto HLS",
          isM3U8: isHls,
        };
      });

      // Proxify subtitles / tracks if available
      const rawSubtitles = (sourcesData as any).subtitles || (sourcesData as any).tracks || [];
      const proxiedTracks = rawSubtitles
        .filter((t: any) => (t.file || t.url) && (t.kind === "subtitles" || t.kind === "captions" || !t.kind))
        .map(
          (t: { url?: string; file?: string; label?: string; kind?: string; default?: boolean; lang?: string }) => ({
            url: (t.file || t.url)
              ? `${hostOrigin}/api/proxy/stream?url=${encodeURIComponent(t.file || t.url || "")}&referer=${encodeURIComponent(referer)}`
              : "",
            lang: t.lang || t.label || t.kind || "Subtitles",
            label: t.label || "English",
            default: t.default || false,
          })
        );

      // Prioritize Indonesian and English tracks at top of list
      proxiedTracks.sort((a: any, b: any) => {
        const aIndo = /indo|bahasa/i.test(a.label || a.lang);
        const bIndo = /indo|bahasa/i.test(b.label || b.lang);
        if (aIndo && !bIndo) return -1;
        if (!aIndo && bIndo) return 1;

        const aEng = /eng/i.test(a.label || a.lang);
        const bEng = /eng/i.test(b.label || b.lang);
        if (aEng && !bEng) return -1;
        if (!aEng && bEng) return 1;

        return (a.label || "").localeCompare(b.label || "");
      });

      return NextResponse.json({
        sources: proxiedSources,
        subtitles: proxiedTracks,
        intro: sourcesData.intro,
        outro: (sourcesData as any).outro,
        server: targetServer,
        category,
        provider: "hianime",
      });
    }
  } catch (err: any) {
    console.error(`[aniwatch] HiAnime extraction error for "${episodeId}" on server "${server}":`, err?.message || err);
  }

  // 2. Fallback to external Custom/Consumet API if configured
  const streamApiUrl =
    process.env.STREAM_API_URL || process.env.NEXT_PUBLIC_STREAM_API_URL;

  if (streamApiUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const extUrl = `${streamApiUrl}/watch/${encodeURIComponent(
        episodeId
      )}?server=${server}`;

      const res = await fetch(extUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        if (data.sources && data.sources.length > 0) {
          const referer = data.headers?.Referer || "";

          const proxiedSources = data.sources.map(
            (s: { url: string; quality?: string; isM3U8?: boolean }) => {
              const isHls = s.isM3U8 ?? s.url.includes(".m3u8");
              const finalUrl = isHls
                ? `${hostOrigin}/api/proxy/stream?url=${encodeURIComponent(
                    s.url
                  )}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`
                : s.url;

              return {
                url: finalUrl,
                quality: s.quality || "Auto HLS",
                isM3U8: isHls,
              };
            }
          );

          return NextResponse.json({
            sources: proxiedSources,
            subtitles: data.subtitles || [],
            intro: data.intro,
            outro: data.outro,
            server,
          });
        }
      }
    } catch (extErr: any) {
      console.error("[stream] External fallback API error:", extErr?.message || extErr);
    }
  }

  // 3. NO DUMMY VIDEO!
  // Return descriptive error with clear message
  return NextResponse.json(
    {
      sources: [],
      subtitles: [],
      error: `Video stream tidak ditemukan di server ${server.toUpperCase()} untuk episode ini. Silakan coba beralih ke Server lain (HD-1, HD-2, atau MegaCloud).`,
      server,
      episodeId,
    },
    { status: 200 }
  );
}
