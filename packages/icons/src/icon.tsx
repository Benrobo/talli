import type { CSSProperties } from "react";
import type { IconProps } from "./types.js";

/**
 * Render an icon shipped via the `add-icon` CLI.
 *
 * Duotone icons accept a `tone` prop that paints the secondary
 * (low-opacity) layer through a `--icon-tone` CSS variable.
 *
 * ```tsx
 * import { Icon, HomeIcon } from "@app/icons";
 *
 * <Icon data={HomeIcon} size={20} tone="oklch(76% 0.12 80)" />
 * ```
 */
export function Icon({ data, size = 24, className, tone, label }: IconProps) {
  const style: CSSProperties | undefined = tone
    ? ({ "--icon-tone": tone } as CSSProperties)
    : undefined;

  const a11y = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true as const };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={data.viewBox}
      className={className}
      width={size}
      height={size}
      fill="none"
      style={style}
      {...a11y}
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  );
}
