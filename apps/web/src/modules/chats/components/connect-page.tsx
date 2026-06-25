import { useState } from "react";
import { cn } from "@app/ui";
import { Link } from "@tanstack/react-router";
import { Button, Card } from "@/components/ui";
import { Copy01Icon, Icon, Tick02Icon } from "@app/icons";
import { MobileScreen } from "@/components/layout";
import { PlatformTile } from "@/modules/chats/components/platform-tile";
import type { ChatPlatform } from "@/modules/chats/types";
import { linkCode } from "@/data/mock/chats";

interface PlatformOption {
  platform: ChatPlatform;
  title: string;
  sub: string;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  { platform: "whatsapp", title: "WhatsApp", sub: "Private chat" },
  { platform: "telegram", title: "Telegram", sub: "Private or group" },
];

const TRY_SAYING = [
  "collect ₦3,000 from everyone",
  "save ₦2,000 to my rent jar",
  "send ₦5,000 to Tunde",
];

/** Connect a chat — setup flow (screens 1a / 1b). */
export function ConnectPage() {
  const [linked, setLinked] = useState(false);
  const [selected, setSelected] = useState<ChatPlatform>("whatsapp");

  if (linked) {
    return (
      <MobileScreen
        footer={
          <Link to="/home">
            <Button block size="lg">
              Go to my chat
            </Button>
          </Link>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="mb-8 flex size-[86px] items-center justify-center rounded-full bg-iris">
            <Icon data={Tick02Icon} size={38} className="text-white" />
          </span>
          <h1 className="mb-3.5 font-serif text-[39px] font-normal leading-none">
            You're connected
          </h1>
          <p className="mb-8 text-[15px] leading-relaxed text-content-muted">
            This WhatsApp chat is now linked to{" "}
            <b className="font-medium text-content">Benaiah FC</b>. Just type what
            you want — collect, save, or send.
          </p>
          <Card tone="night" className="w-full text-left">
            <div className="mb-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-on-night-soft">
              Try saying
            </div>
            <div className="flex flex-col gap-3">
              {TRY_SAYING.map((line) => (
                <div key={line} className="font-mono text-[12.5px] text-[#c9b7ff]">
                  {line}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      footer={
        <Button block size="lg" onClick={() => setLinked(true)}>
          Open WhatsApp
        </Button>
      }
    >
      <div className="mb-7 flex gap-1.5">
        <span className="h-[3px] flex-1 rounded-full bg-iris" />
        <span className="h-[3px] flex-1 rounded-full bg-iris" />
        <span className="h-[3px] flex-1 rounded-full bg-track" />
      </div>

      <h1 className="mb-2.5 font-serif text-[35px] font-normal leading-none">
        Connect a chat
      </h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-content-muted">
        Pick where you talk money. Talli links to that chat — there's no new app
        to install.
      </p>

      <div className="mb-7 flex flex-col gap-3">
        {PLATFORM_OPTIONS.map((option) => {
          const active = selected === option.platform;
          return (
            <Card
              key={option.platform}
              role="button"
              onClick={() => setSelected(option.platform)}
              className={cn(
                "flex cursor-pointer items-center gap-3",
                active && "border-iris ring-[3px] ring-iris-soft"
              )}
            >
              <PlatformTile platform={option.platform} />
              <div className="flex-1">
                <div className="text-[15px] font-medium">{option.title}</div>
                <div className="text-[12.5px] text-content-muted">{option.sub}</div>
              </div>
              {active ? (
                <span className="flex size-[22px] items-center justify-center rounded-full bg-iris">
                  <Icon data={Tick02Icon} size={12} className="text-white" />
                </span>
              ) : (
                <span className="size-[21px] rounded-full border-2 border-[#cfccdd]" />
              )}
            </Card>
          );
        })}
      </div>

      <Card tone="night" className="text-center">
        <div className="mb-3 text-[12.5px] text-on-night">
          Send this to <b className="font-medium text-white">Talli</b> on WhatsApp
        </div>
        <div className="mb-3 flex items-center justify-center gap-3 rounded-[11px] border border-line bg-white/5 py-3.5 font-mono text-[20px] tracking-[0.04em] text-white">
          link {linkCode}
          <button type="button" aria-label="Copy link code" className="text-on-night">
            <Icon data={Copy01Icon} size={18} />
          </button>
        </div>
        <div className="font-mono text-[11px] text-on-night-soft">
          expires in 15:00 · tap to copy
        </div>
      </Card>
    </MobileScreen>
  );
}
