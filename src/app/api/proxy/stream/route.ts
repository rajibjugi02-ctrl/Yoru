import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const targetUrl = searchParams.get("url");
  const referer = searchParams.get("referer");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const urlObj = new URL(targetUrl);
    const origin = urlObj.origin;

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: referer || `${origin}/`,
      Origin: referer ? new URL(referer).origin : origin,
    };

    const response = await fetch(targetUrl, {
      headers,
      redirect: "follow",
    });

    if (!response.ok) {
      return new NextResponse(`Upstream returned ${response.status}`, {
        status: response.status,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const contentType = response.headers.get("content-type") || "";

    // Check if this is an m3u8 playlist manifest
    if (
      targetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL")
    ) {
      const text = await response.text();

      if (text.includes("#EXTM3U")) {
        // Rewrite lines to route chunk/sub-playlist requests through this proxy
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
        const hostProxy = req.nextUrl.origin + "/api/proxy/stream";

        const rewritten = text
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;

            // URI attribute in tags like #EXT-X-KEY:METHOD=AES-128,URI="...",...
            if (trimmed.startsWith("#EXT-X-KEY:") && trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/, (_match, keyUri) => {
                const resolvedKeyUrl = keyUri.startsWith("http")
                  ? keyUri
                  : new URL(keyUri, baseUrl).toString();
                const proxiedKey = `${hostProxy}?url=${encodeURIComponent(
                  resolvedKeyUrl
                )}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;
                return `URI="${proxiedKey}"`;
              });
            }

            // Comment or Directive
            if (trimmed.startsWith("#")) {
              return line;
            }

            // Playlist URL or TS segment
            const resolvedUrl = trimmed.startsWith("http")
              ? trimmed
              : new URL(trimmed, baseUrl).toString();

            return `${hostProxy}?url=${encodeURIComponent(resolvedUrl)}${
              referer ? `&referer=${encodeURIComponent(referer)}` : ""
            }`;
          })
          .join("\n");

        return new NextResponse(rewritten, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    // Subtitle track (.vtt)
    if (targetUrl.includes(".vtt") || contentType.includes("vtt")) {
      const text = await response.text();
      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Binary / TS Segment or other stream media
    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Stream Proxy Error:", error);
    return new NextResponse("Internal Proxy Error", {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
