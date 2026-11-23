/**
 * Prefixes a /public asset path with the deploy base path (GitHub Pages
 * serves the site under /<repo>/). Next adds basePath to <Link> automatically,
 * but not to plain <img> or unoptimized next/image sources.
 */
export function assetPath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
