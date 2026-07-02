import { cn } from "@/lib/utils";

interface UserAvatarProps {
  seed?: string | null;
  size?: number;
  className?: string;
}

export function dicebearUrl(seed?: string | null): string {
  const s = encodeURIComponent((seed ?? "").trim() || "talli");
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${s}&backgroundColor=eee9fc,ddd6fe,e9d5ff&radius=50`;
}

export function UserAvatar({ seed, size = 36, className }: UserAvatarProps) {
  return (
    <img
      src={dicebearUrl(seed)}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-full border border-hairline bg-iris-soft object-cover", className)}
    />
  );
}
