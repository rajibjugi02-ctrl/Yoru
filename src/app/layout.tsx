import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { SearchProvider } from "@/context/SearchContext";
import { Navbar } from "@/components/navigation/Navbar";
import { AppWrapper } from "@/components/layout/AppWrapper";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Yoru - Streaming Anime Bebas Iklan",
  description:
    "Yoru adalah aplikasi web streaming anime bebas iklan dengan nuansa dark mode ambient liquid glass elegan.",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${inter.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans bg-[#08090C] text-[#F8FAFC] min-h-screen relative selection:bg-indigo-500/30 selection:text-indigo-200">
        <SearchProvider>
          {/* Ambient Background Glows */}
          <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[450px] bg-gradient-to-b from-indigo-900/20 via-indigo-950/5 to-transparent blur-[120px] rounded-full" />
            <div className="absolute top-[35%] -left-[10%] w-[450px] h-[450px] bg-indigo-950/15 blur-[140px] rounded-full" />
            <div className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] bg-violet-950/15 blur-[140px] rounded-full" />
          </div>

          {/* Adaptive Navigation (Desktop & Mobile) */}
          <Navbar />

          {/* Main Page Content wrapped in Elastic Pull-to-Refresh */}
          <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-16 px-4 md:px-8 max-w-7xl mx-auto">
            <AppWrapper>{children}</AppWrapper>
          </main>

          {/* Parallel Route Modal Slot for Intercepting Route Sheet */}
          {modal}
        </SearchProvider>
      </body>
    </html>
  );
}
