import type { ReactElement, ReactNode } from "react";
import type { Placement } from "tippy.js";
import { TippyTooltip } from "@/components/ui/tippy-tooltip";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

function mapSideAlign(side?: Side, align?: Align): Placement {
  const base = side || "top";
  if (!align || align === "center") return base;
  return `${base}-${align}` as Placement;
}

export interface HintProps {
  label: string;
  children: ReactNode;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  delayDuration?: number;
}

export function Hint({ label, children, side, align, sideOffset, delayDuration = 100 }: HintProps) {
  return (
    <TippyTooltip
      content={label}
      placement={mapSideAlign(side, align)}
      delay={[delayDuration, 0]}
      offset={[0, sideOffset ?? 8]}
      theme="dark"
    >
      {children as ReactElement}
    </TippyTooltip>
  );
}

export interface InfoTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  maxWidth?: number | string;
  theme?: "dark" | "light";
  delayDuration?: number;
}

export function InfoTooltip({
  content,
  children,
  side = "top",
  align = "start",
  sideOffset,
  maxWidth = 320,
  theme = "dark",
  delayDuration = 100,
}: InfoTooltipProps) {
  return (
    <TippyTooltip
      content={content}
      placement={mapSideAlign(side, align)}
      delay={[delayDuration, 0]}
      offset={[0, sideOffset ?? 8]}
      interactive
      theme={theme}
      maxWidth={maxWidth}
    >
      {children as ReactElement}
    </TippyTooltip>
  );
}
