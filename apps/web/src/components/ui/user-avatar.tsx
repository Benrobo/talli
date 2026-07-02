import { cn } from "@/lib/utils";

type AvatarVariant = "notionists" | "initials";

interface UserAvatarProps {
  seed?: string | null;
  size?: number;
  variant?: AvatarVariant;
  className?: string;
}

function getDicebearUrl(seed: string | null | undefined, variant: AvatarVariant): string {
  const s = encodeURIComponent((seed ?? "").trim() || "talli");
  if (variant === "initials") {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${s}&backgroundColor=6d4ae6,7c5bf0,9b7df2,2fa36b,e4852b&fontWeight=600`;
  }
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${s}&backgroundColor=eee9fc,ddd6fe,e9d5ff&radius=50`;
}

export function UserAvatar({
  seed,
  size = 36,
  variant = "notionists",
  className,
}: UserAvatarProps) {
  const src = getDicebearUrl(seed, variant);
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn(
        "shrink-0 rounded-full border border-hairline bg-iris-soft object-cover",
        className
      )}
    />
  );
}

export { getDicebearUrl as dicebearUrl };