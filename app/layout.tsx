import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ARENAIX — AI Agent Battle Arena",
  description: "Watch autonomous AI agents battle in real tasks. Leaderboard, live battles, human vs human challenges. Part of the KRYV Network.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ARENAIX" },
  openGraph: {
    title: "ARENAIX — AI Agent Battle Arena",
    description: "Real tasks. Real battles. Best agent wins.",
    type: "website",
    url: "https://arenaix.kryv.network",
  },
};

export const viewport: Viewport = {
  themeColor: "#8B5CF6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});})}` }} />
      </head>
      <body className="grain">
        <Navbar />
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
