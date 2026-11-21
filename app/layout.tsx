import type { Metadata, Viewport } from "next";
import "@fontsource-variable/chivo-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "QuestOps: make your event a game", template: "%s" },
  description: "Quests, QR stations, teams and a live leaderboard for events, run from one console.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  applicationName: "QuestOps",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef0f4",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
