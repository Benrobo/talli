export const ILLUSTRATIONS = {
  emptyJar: "/illustrations/empty-jar.png",
  highFive: "/illustrations/high-five.png",
  jarWithCoin: "/illustrations/jar-with-coin.png",
  leaf: "/illustrations/leaf.png",
} as const;

export const LANDING_ILLUSTRATION_PRELOADS = [
  { href: ILLUSTRATIONS.emptyJar },
  { href: ILLUSTRATIONS.highFive },
  { href: ILLUSTRATIONS.jarWithCoin },
  { href: ILLUSTRATIONS.leaf },
] as const;
