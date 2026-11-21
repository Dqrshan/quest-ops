import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  // Lets a phone on the same Wi-Fi load the dev server's scripts via the laptop's LAN address.
  // Development only; it has no effect on a production build.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default config;
