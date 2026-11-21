import type { Metadata, Viewport } from "next";
import "@fontsource-variable/antonio";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/azeret-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "QuestOps: tonight, your event is the feature", template: "%s" },
  description: "Run a live event as a game: AI-drafted quests, QR stations, teams, announcements and a venue screen that runs itself.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  applicationName: "QuestOps",
  openGraph: { title: "QuestOps", description: "Tonight, your event is the feature.", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1210",
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
