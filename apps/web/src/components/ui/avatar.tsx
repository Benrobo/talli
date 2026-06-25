import { cn } from "@app/ui";
import { initials } from "@/lib/format";

type AvatarTone = "iris" | "muted";
type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  tone?: AvatarTone;
  size?: AvatarSize;
  className?: string;
}

const SIZES: Record<AvatarSize, string> = {
  sm: "size-8 text-[11px]",
  md: "size-[34px] text-xs",
  lg: "size-[38px] text-[13px]",
};

const TONES: Record<AvatarTone, string> = {
  iris: "bg-iris-soft text-iris-deep",
  muted: "bg-[#ECEAF3] text-content-muted",
};

export function Avatar({ name, tone = "iris", size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        SIZES[size],
        TONES[tone],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
