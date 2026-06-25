import { cn } from "@app/ui";
import { Icon, TelegramIcon, WhatsappIcon } from "@app/icons";
import type { ChatPlatform } from "@/modules/chats/types";

interface PlatformTileProps {
  platform: ChatPlatform;
  className?: string;
}

/** Rounded brand-colored square holding a platform glyph. */
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
        data={platform === "whatsapp" ? WhatsappIcon : TelegramIcon}
        size={21}
        className="text-white"
      />
    </span>
  );
}
