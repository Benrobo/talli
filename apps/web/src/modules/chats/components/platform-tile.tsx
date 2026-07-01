import { cn } from "@app/ui";
import { Icon } from "@benrobo/iconary/react";
import { TelegramIcon, WhatsappIcon } from "@benrobo/iconary/core/duotone-rounded";
import type { ChatPlatform } from "@/modules/chats/types";

interface PlatformTileProps {
  platform: ChatPlatform;
  className?: string;
}

export function PlatformTile({ platform, className }: PlatformTileProps) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-[13px]",
        platform === "whatsapp" ? "bg-[#1FA855]" : "bg-[#2AABEE]",
        className
      )}
    >
      <Icon
        icon={platform === "whatsapp" ? WhatsappIcon : TelegramIcon}
        size={21}
        className="text-white"
      />
    </span>
  );
}
