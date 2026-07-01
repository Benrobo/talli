import { cn } from "@app/ui";
import type { ChatPlatform } from "@/modules/chats/types";

interface PlatformTileProps {
  platform: ChatPlatform;
  className?: string;
  imgClassName?: string;
}

const LOGO: Record<ChatPlatform, string> = {
  telegram: "/telegram.png",
  whatsapp: "/whatsapp.png",
};

export function PlatformTile({ platform, className, imgClassName }: PlatformTileProps) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-[13px] border border-hairline bg-card shadow-chip",
        className
      )}
    >
      <img
        src={LOGO[platform]}
        alt={platform === "telegram" ? "Telegram" : "WhatsApp"}
        className={cn("size-[62%] object-contain", imgClassName)}
      />
    </span>
  );
}
