import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@consumet/extensions", "aniwatch"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "otakudesu.blog" },
      { protocol: "https", hostname: "**.otakudesu.blog" },
      { protocol: "https", hostname: "otakudesu.cloud" },
      { protocol: "https", hostname: "**.otakudesu.cloud" },
      { protocol: "https", hostname: "otakudesu.bid" },
      { protocol: "https", hostname: "**.otakudesu.bid" },
      { protocol: "https", hostname: "samehadaku.how" },
      { protocol: "https", hostname: "**.samehadaku.how" },
      { protocol: "https", hostname: "samehadaku.care" },
      { protocol: "https", hostname: "**.samehadaku.care" },
      { protocol: "https", hostname: "sankavollerei.web.id" },
      { protocol: "https", hostname: "**.sankavollerei.web.id" },
      { protocol: "https", hostname: "kuramanime.pro" },
      { protocol: "https", hostname: "**.kuramanime.pro" },
      { protocol: "https", hostname: "kuramanime.net" },
      { protocol: "https", hostname: "**.kuramanime.net" },
      { protocol: "https", hostname: "kuramanime.org" },
      { protocol: "https", hostname: "**.kuramanime.org" },
      { protocol: "https", hostname: "kuramanime.top" },
      { protocol: "https", hostname: "**.kuramanime.top" },
      { protocol: "https", hostname: "kuramadrive.com" },
      { protocol: "https", hostname: "**.kuramadrive.com" },
      { protocol: "https", hostname: "qu.ax" },
      { protocol: "https", hostname: "**.qu.ax" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "img.flawlessfiles.com" },
      { protocol: "https", hostname: "**.flawlessfiles.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
    ],
  },
};

export default nextConfig;
