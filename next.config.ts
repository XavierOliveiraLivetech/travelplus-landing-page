import type { NextConfig } from "next";

/**
 * GITHUB_PAGES=true builds a fully static site (./out) for GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH is the repo sub-path, e.g. "/travelplus-landing-page".
 * Without these, the normal standalone server build is produced.
 */
const isStaticExport = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? { output: "export", trailingSlash: true, basePath }
    : { output: "standalone" }),
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
