import type { CSSProperties } from "react";

/**
 * Icon style variants supported by the add-icon CLI.
 *
 * - `duotone-rounded` — two-tone filled icons with a `--icon-tone` CSS variable
 *   on the opacity layer. This is the **default** for product UI.
 * - `twotone-rounded` — distinct two-color stroke icons.
 *
 * Both styles are sourced from `~/projects/design-icons/icons/<style>/`.
 */
export type IconStyle = "duotone-rounded" | "twotone-rounded";

export interface IconData {
  /** Inline SVG content (everything between the <svg> tags). */
  content: string;
  viewBox: string;
  /** Style this icon was extracted from. */
  style: IconStyle;
}

export interface IconProps {
  data: IconData;
  size?: number | string;
  className?: string;
  /**
   * Color for the secondary (low-opacity) layer of duotone icons.
   * Falls back to `currentColor` if not set.
   */
  tone?: CSSProperties["color"];
  /**
   * Optional aria-label. When unset the icon is treated as decorative
   * (`aria-hidden="true"`).
   */
  label?: string;
}
