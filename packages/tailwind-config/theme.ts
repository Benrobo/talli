/**
 * TypeScript export of the brand palette and radii so non-CSS consumers
 * (charts, JS canvas, native renderers) can read the same tokens.
 *
 * Keep in sync with the `@theme` block in `globals.css`.
 */
export const colors = {
  brand: {
    50: "oklch(96.5% 0.025 80)",
    100: "oklch(92% 0.05 80)",
    200: "oklch(85% 0.08 80)",
    300: "oklch(76% 0.12 80)",
    400: "oklch(67% 0.15 80)",
    500: "oklch(58% 0.17 80)",
    600: "oklch(49% 0.16 80)",
    700: "oklch(41% 0.14 80)",
    800: "oklch(33% 0.10 80)",
    900: "oklch(25% 0.07 80)",
  },
  ink: "oklch(18% 0.01 250)",
  paper: "oklch(98.5% 0.005 90)",
  muted: "oklch(54% 0.005 250)",
  surface: "oklch(100% 0 0)",
  border: "oklch(91% 0.005 250)",
  success: "oklch(60% 0.18 145)",
  warning: "oklch(75% 0.16 80)",
  danger: "oklch(60% 0.21 27)",
  info: "oklch(65% 0.15 240)",
} as const;

export const radii = {
  xs: "0.25rem",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
} as const;

export type BrandColor = keyof typeof colors.brand;
