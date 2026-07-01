import { cn } from "@app/ui";
import { initials } from "@/lib/format";

type AvatarTone = "iris" | "muted" | "auto";
type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  tone?: AvatarTone;
  size?: AvatarSize;
  className?: string;
}

const SIZES: Record<AvatarSize, string> = {
  sm: "size-8 text-[11px]",
  md: "size-[34px] text-[12px]",
  lg: "size-[38px] text-[13px]",
  xl: "size-11 text-[15px]",
};

const PALETTE = [
  "bg-[#EEE9FC] text-[#5636C4]",
  "bg-[#E4F4EC] text-[#1F7D50]",
  "bg-[#FBF0DD] text-[#A8681A]",
  "bg-[#E8EEF7] text-[#3A6EA5]",
  "bg-[#FCE9EA] text-[#C02D33]",
  "bg-[#EAEFE6] text-[#5E7350]",
] as const;

function autoTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({ name, tone = "auto", size = "md", className }: AvatarProps) {
  const tint =
    tone === "iris"
      ? "bg-iris-soft text-iris-deep"
      : tone === "muted"
        ? "bg-inset text-content-muted"
        : autoTone(name);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase",
        SIZES[size],
        tint,
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
