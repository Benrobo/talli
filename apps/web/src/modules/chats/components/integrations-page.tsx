import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FadeIn,
  StatusPill,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowRight01Icon,
  Copy01Icon,
  Delete02Icon,
  Location01Icon,
  MoreHorizontalIcon,
  RefreshIcon,
  Tick02Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { PlatformTile } from "@/modules/chats/components/platform-tile";
import { linkedChats, linkCode, botHandle } from "@/data/mock/chats";
import type { ChatPlatform, LinkedChat } from "@/modules/chats/types";

interface Integration {
  platform: ChatPlatform;
  name: string;
  blurb: string;
  available: boolean;
}

const INTEGRATIONS: Integration[] = [
  {
    platform: "telegram",
    name: "Telegram",
    blurb: "Run collections, splits and transfers from any Telegram chat or group.",
    available: true,
  },
  {
    platform: "whatsapp",
    name: "WhatsApp",
    blurb: "Split bills and send money right inside a WhatsApp chat.",
    available: false,
  },
];

export function IntegrationsPage() {
  const [selected, setSelected] = useState<ChatPlatform>("telegram");
  const [chats, setChats] = useState<LinkedChat[]>(linkedChats);
  const active = INTEGRATIONS.find((i) => i.platform === selected)!;
  const chatsFor = (p: ChatPlatform) => chats.filter((c) => c.platform === p);
  const disconnect = (id: string) => setChats((prev) => prev.filter((c) => c.id !== id));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[25px] font-bold tracking-[-0.02em] text-foreground">Integrations</h1>
        <p className="mt-1 text-[13.5px] text-content-muted">
          Connect a chat so Talli can collect, split and send for this workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <FadeIn className="flex flex-col gap-2">
          {INTEGRATIONS.map((it) => {
            const isSelected = it.platform === selected;
            const count = chatsFor(it.platform).length;
            return (
              <button
                key={it.platform}
                type="button"
                onClick={() => setSelected(it.platform)}
                className={cn(
                  "t-press flex items-center gap-3 rounded-[14px] border p-3 text-left transition-colors",
                  isSelected
                    ? "border-iris/30 bg-iris-soft/50"
                    : "border-hairline bg-card hover:bg-inset"
                )}
              >
                <PlatformTile platform={it.platform} className="size-10 rounded-[11px]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
                    {it.name}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-content-faint">
                    {it.available ? (count > 0 ? `${count} chat${count > 1 ? "s" : ""} linked` : "Not connected") : "Coming soon"}
                  </div>
                </div>
                {it.available && count > 0 ? (
                  <span className="size-1.5 rounded-full bg-emerald" />
                ) : null}
              </button>
            );
          })}
        </FadeIn>

        <FadeIn delay={0.06}>
          {active.available ? (
            <TelegramPanel chats={chatsFor("telegram")} onDisconnect={disconnect} />
          ) : (
            <ComingSoonPanel integration={active} />
          )}
        </FadeIn>
      </div>
    </div>
  );
}

function PanelHeader({
  platform,
  name,
  status,
}: {
  platform: ChatPlatform;
  name: string;
  status: "connected" | "soon";
}) {
  return (
    <div className="flex items-center gap-3.5 border-b border-hairline-soft p-5">
      <PlatformTile platform={platform} className="size-12 rounded-[14px]" />
      <div className="flex-1">
        <div className="font-display text-[19px] font-bold tracking-[-0.02em] text-foreground">{name}</div>
        <div className="mt-0.5 text-[12.5px] text-content-muted">
          {status === "connected" ? "Bot integration · @" + botHandle : "Not available yet"}
        </div>
      </div>
      {status === "connected" ? (
        <StatusPill status="success" dot>
          Connected
        </StatusPill>
      ) : (
        <StatusPill status="neutral">Coming soon</StatusPill>
      )}
    </div>
  );
}

function newCode(previous: string) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) suffix += alphabet[(previous.charCodeAt(i + 6) * 7 + i * 13) % alphabet.length];
  return `TALLI-${suffix}`;
}

function TelegramPanel({ chats, onDisconnect }: { chats: LinkedChat[]; onDisconnect: (id: string) => void }) {
  const [code, setCode] = useState(linkCode);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(`/start ${code}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setCopied(false);
    setTimeout(() => {
      setCode((prev) => newCode(prev + prev));
      setRefreshing(false);
    }, 550);
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-hairline bg-card shadow-card">
      <PanelHeader platform="telegram" name="Telegram" status="connected" />

      <div className="p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.11em] text-content-faint">
          Add Talli to a chat
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Step index={1} title="Open the bot">
            Start a chat with{" "}
            <a
              href={`https://t.me/${botHandle}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-iris-deep"
            >
              @{botHandle}
            </a>{" "}
            on Telegram, or add it to your group.
          </Step>
          <Step index={2} title="Send the code">
            Paste the command below. Talli links that chat to this workspace instantly.
          </Step>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-hairline bg-inset px-4 py-2.5">
          <span className="flex-1 font-mono text-[15px] font-semibold tracking-[0.06em] text-foreground">
            /start {code}
          </span>
          <button
            onClick={refresh}
            title="Generate a new code"
            className="t-press flex size-8 items-center justify-center rounded-[10px] text-content-muted hover:bg-card hover:text-foreground"
          >
            <Icon icon={RefreshIcon} size={15} className={refreshing ? "animate-spin" : undefined} />
          </button>
          <button
            onClick={copy}
            title="Copy command"
            className={cn(
              "t-press flex size-8 items-center justify-center rounded-[10px]",
              copied ? "bg-emerald-soft text-emerald-deep" : "bg-iris-soft text-iris-deep"
            )}
          >
            <Icon icon={copied ? Tick02Icon : Copy01Icon} size={15} />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[11.5px] text-content-faint">
          <Icon icon={Location01Icon} size={12} />
          Group admins only · single-use, expires 15 minutes after you generate it.
        </p>
      </div>

      <div className="border-t border-hairline-soft px-5 pb-1 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground">Connected chats</span>
          <span className="text-[12px] text-content-faint">{chats.length} active</span>
        </div>
      </div>
      <div className="px-2 pb-2 pt-1">
        {chats.length === 0 ? (
          <div className="px-3 py-8 text-center text-[13px] text-content-muted">
            No chats linked yet. Send the code above in a Telegram chat to connect one.
          </div>
        ) : (
          chats.map((chat) => <ChatRow key={chat.id} chat={chat} onDisconnect={() => onDisconnect(chat.id)} />)
        )}
      </div>
    </div>
  );
}

function Step({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[13px] border border-hairline bg-inset/50 p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-iris-soft font-display text-[11px] font-bold text-iris-deep">
          {index}
        </span>
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-[12.5px] leading-relaxed text-content-muted">{children}</p>
    </div>
  );
}

function ChatRow({ chat, onDisconnect }: { chat: LinkedChat; onDisconnect: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors hover:bg-inset">
      <PlatformTile platform={chat.platform} className="size-9 rounded-[10px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-foreground">{chat.title}</div>
        <div className="truncate text-[11.5px] text-content-faint">{chat.meta}</div>
      </div>
      <StatusPill status="success" dot>
        Active
      </StatusPill>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title="Manage chat"
            className="t-press flex size-8 items-center justify-center rounded-lg text-content-muted hover:bg-card hover:text-foreground"
          >
            <Icon icon={MoreHorizontalIcon} size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px] rounded-[13px]">
          <DropdownMenuItem>
            <Icon icon={ArrowRight01Icon} size={15} />
            Open in Telegram
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-deep focus:bg-rose-soft focus:text-rose-deep"
            onSelect={onDisconnect}
          >
            <Icon icon={Delete02Icon} size={15} />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ComingSoonPanel({ integration }: { integration: Integration }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-hairline bg-card shadow-card">
      <PanelHeader platform={integration.platform} name={integration.name} status="soon" />
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <PlatformTile platform={integration.platform} className="size-14 rounded-2xl opacity-70" />
        <div className="mt-4 font-display text-[17px] font-bold tracking-[-0.01em] text-foreground">
          {integration.name} is coming soon
        </div>
        <p className="mt-1.5 max-w-[320px] text-[13px] text-content-muted">{integration.blurb}</p>
        <Button variant="secondary" className="mt-5" trailingIcon={<Icon icon={ArrowRight01Icon} size={15} />}>
          Notify me when it's ready
        </Button>
      </div>
    </div>
  );
}
