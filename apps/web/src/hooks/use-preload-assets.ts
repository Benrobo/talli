import { useEffect } from "react";

type PreloadAsset = {
  href: string;
  as?: "image" | "font" | "fetch" | "script" | "style";
  type?: string;
  crossOrigin?: "anonymous" | "use-credentials";
};

/**
 * Injects `<link rel="preload">` tags for the given assets and removes them on unmount.
 */
export function usePreloadAssets(assets: readonly PreloadAsset[]) {
  const key = assets.map((asset) => `${asset.as ?? "image"}:${asset.href}`).join("|");

  useEffect(() => {
    const links = assets.map((asset) => {
      const existing = document.head.querySelector(
        `link[rel="preload"][href="${asset.href}"]`
      );
      if (existing) return null;

      const link = document.createElement("link");
      link.rel = "preload";
      link.href = asset.href;
      link.as = asset.as ?? "image";
      if (asset.type) link.type = asset.type;
      if (asset.crossOrigin) link.crossOrigin = asset.crossOrigin;
      document.head.appendChild(link);
      return link;
    });

    return () => {
      for (const link of links) {
        link?.remove();
      }
    };
  }, [key]);
}
