import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  FadeIn,
  StatusPill,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowRight01Icon,
  BubbleChatIcon,
  Copy01Icon,
  Delete02Icon,
  Link01Icon,
  Location01Icon,
  MoreHorizontalIcon,
  RefreshIcon,
  UserGroupIcon,
} from "@benrobo/iconary/core/duotone-rounded";
import { Tick02Icon } from "@benrobo/iconary/core/solid-rounded";
import {
  useConnectedChats,
  useCreateLinkCode,
  useDisconnectChat,
} from "@/api/http/v1/chat/chat.hooks";
import { IntegrationsSkeleton } from "@/components/skeleton-loaders";
import type { ConnectedChat, CreateLinkCodePayload, LinkCodeData } from "@/api/http/v1/chat/chat.types";
import { PlatformTile } from "@/modules/chats/components/platform-tile";
import type { ChatPlatform } from "@/modules/chats/types";

const TELEGRAM_BOT_USERNAME = "trytalli_bot";

type LinkPurpose = CreateLinkCodePayload["purpose"];

const LINK_PURPOSE_OPTIONS: {
  purpose: LinkPurpose;
  title: string;
  description: string;
  icon: typeof UserGroupIcon;
}[] = [
  {
    purpose: "group_link",
    title: "Group chat",
    description: "Add the bot to a Telegram group, then post a /start command as an admin.",
    icon: UserGroupIcon,
  },
  {
    purpose: "private_link",
    title: "Direct message",
    description: "Open a tap-to-start link in Telegram to link your private chat with the bot.",
    icon: BubbleChatIcon,
  },
];

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
    blurb: "Private-chat collections, savings and payment updates. Group support is on the way.",
    available: false,
  },
];

function toChatPlatform(platform: string): ChatPlatform {
  return platform === "whatsapp" ? "whatsapp" : "telegram";
}

function formatChatMeta(chat: ConnectedChat): string {
  const linkedDate = dayjs(chat.createdAt).format("MMM D");
  const typeLabel = chat.chatType === "group" ? "Group" : "Private chat";
  const connector = chat.connectedBy ? ` · linked by ${chat.connectedBy}` : "";
  return `${typeLabel}${connector} · ${linkedDate}`;
}

function formatExpiry(expiresAt: string): string {
  const minutes = Math.max(1, dayjs(expiresAt).diff(dayjs(), "minute"));
  return `Single-use · expires in ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function linkDisplay(linkData: LinkCodeData): string {
  return linkData.command ?? `/start ${linkData.code}`;
}

function linkHint(purpose: LinkPurpose): string {
  if (purpose === "group_link") {
    return "Group admins only";
  }
  return "Opens a DM with the bot to link your private chat";
}

export function IntegrationsPage() {
  const [linking, setLinking] = useState(false);
  const { data: response, isLoading, isError } = useConnectedChats({
    pollMs: linking ? 4000 : undefined,
  });
  const telegramChats = (response?.data ?? []).filter(
    (chat) => chat.platform === "telegram" && chat.status === "active"
  );
  const whatsapp = INTEGRATIONS.find((integration) => integration.platform === "whatsapp")!;

  if (isLoading) {
    return <IntegrationsSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-6">
        <h1 className="font-display text-[25px] font-bold tracking-[-0.02em] text-foreground">Integrations</h1>
        <p className="mt-1 text-[13.5px] text-content-muted">
          Connect a chat so Talli can collect, split and send for you.
        </p>
      </div>

      <FadeIn>
        {isLoading ? (
          <div className="rounded-[18px] border border-hairline bg-card px-6 py-16 text-center text-[14px] text-content-muted shadow-card">
            Loading connected chats…
          </div>
        ) : isError ? (
          <div className="rounded-[18px] border border-hairline bg-card px-6 py-16 text-center text-[14px] text-content-muted shadow-card">
            Couldn't load connected chats. Refresh and try again.
          </div>
        ) : (
          <TelegramPanel chats={telegramChats} onLinkingChange={setLinking} />
        )}
      </FadeIn>

      <FadeIn delay={0.08} className="mt-4">
        <ComingSoonStrip integration={whatsapp} />
      </FadeIn>
    </div>
  );
}

function PanelHeader({
  platform,
  name,
  connectedCount,
}: {
  platform: ChatPlatform;
  name: string;
  connectedCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-hairline-soft p-4 sm:gap-3.5 sm:p-5">
      <PlatformTile platform={platform} className="size-12 rounded-[14px]" />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[19px] font-bold tracking-[-0.02em] text-foreground">{name}</span>
          {connectedCount > 0 ? (
            <StatusPill status="success" dot>
              Connected
            </StatusPill>
          ) : (
            <StatusPill status="neutral">Not linked</StatusPill>
          )}
        </div>
        <div className="mt-0.5 text-[12.5px] text-content-muted">
          @{TELEGRAM_BOT_USERNAME} · {connectedCount} chat{connectedCount === 1 ? "" : "s"} linked
        </div>
      </div>
    </div>
  );
}

function TelegramPanel({
  chats,
  onLinkingChange,
}: {
  chats: ConnectedChat[];
  onLinkingChange: (linking: boolean) => void;
}) {
  const createLinkCode = useCreateLinkCode();
  const disconnectChat = useDisconnectChat();
  const [purpose, setPurpose] = useState<LinkPurpose>("group_link");
  const [linkData, setLinkData] = useState<LinkCodeData | null>(null);
  const [activePurpose, setActivePurpose] = useState<LinkPurpose | null>(null);
  const [copied, setCopied] = useState(false);

  const displayValue = linkData && activePurpose ? linkDisplay(linkData) : null;

  useEffect(() => {
    onLinkingChange(!!displayValue);
    return () => onLinkingChange(false);
  }, [displayValue, onLinkingChange]);

  async function generateCode() {
    try {
      const result = await createLinkCode.mutateAsync({ platform: "telegram", purpose });
      setLinkData(result.data);
      setActivePurpose(purpose);
      setCopied(false);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Couldn't generate link code. Try again.";
      toast.error(message);
    }
  }

  function copy() {
    if (!displayValue) return;
    navigator.clipboard.writeText(displayValue).then(() => {
      setCopied(true);
      toast.success("Code copied");
      setTimeout(() => setCopied(false), 1600);
    });
  }

  async function handleDisconnect(chatId: string) {
    try {
      await disconnectChat.mutateAsync(chatId);
      toast.success("Chat disconnected");
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Couldn't disconnect chat. Try again.";
      toast.error(message);
    }
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-hairline bg-card shadow-card">
      <PanelHeader platform="telegram" name="Telegram" connectedCount={chats.length} />

      <div className="p-4 sm:p-5">
        <p className="mb-3 text-[12.5px] text-content-muted">
          Add{" "}
          <a
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-iris-deep"
          >
            @{TELEGRAM_BOT_USERNAME}
          </a>{" "}
          to a group or open its DM, then generate a single-use code to link it.
        </p>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex shrink-0 rounded-[11px] border border-hairline bg-inset/60 p-1">
            {LINK_PURPOSE_OPTIONS.map((option) => {
              const selected = purpose === option.purpose;
              return (
                <button
                  key={option.purpose}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPurpose(option.purpose)}
                  className={cn(
                    "t-press flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                    selected
                      ? "bg-iris text-white shadow-chip"
                      : "text-content-muted hover:bg-card hover:text-foreground"
                  )}
                >
                  <Icon icon={option.icon} size={14} />
                  {option.title}
                </button>
              );
            })}
          </div>

          <Button
            onClick={generateCode}
            loading={createLinkCode.isPending}
            leadingIcon={<Icon icon={displayValue ? RefreshIcon : Link01Icon} size={16} />}
          >
            {displayValue ? "New code" : "Generate code"}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {displayValue ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-[14px] border border-iris/25 bg-iris-soft/40 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-iris-deep">
                    {activePurpose === "group_link" ? "Your group code" : "Your code"}
                  </span>
                  <span className="text-[11px] text-content-faint">
                    {linkData ? formatExpiry(linkData.expiresAt) : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-[11px] border border-hairline bg-card px-3.5 py-2.5">
                  <span className="flex-1 break-all font-mono text-[15px] font-bold tracking-[0.05em] text-foreground">
                    {displayValue}
                  </span>
                  <button
                    type="button"
                    onClick={copy}
                    title="Copy code"
                    className={cn(
                      "t-press flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold transition-colors",
                      copied ? "bg-emerald-soft text-emerald-deep" : "bg-iris text-white hover:bg-iris-deep"
                    )}
                  >
                    <Icon icon={copied ? Tick02Icon : Copy01Icon} size={14} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-[11.5px] text-content-faint">
                    <Icon icon={Location01Icon} size={12} />
                    {activePurpose ? linkHint(activePurpose) : ""}
                  </p>
                  {activePurpose === "private_link" && linkData?.deepLink ? (
                    <a href={linkData.deepLink} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm" trailingIcon={<Icon icon={ArrowRight01Icon} size={14} />}>
                        Open in Telegram
                      </Button>
                    </a>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="border-t border-hairline-soft px-4 pb-1 pt-4 sm:px-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground">Connected chats</span>
          <span className="text-[12px] text-content-faint">{chats.length} active</span>
        </div>
      </div>
      <div className="p-3 pt-2">
        {chats.length === 0 ? (
          <EmptyState
            icon={Link01Icon}
            title="No chats linked yet"
            description="Generate a link code above and send it in a Telegram chat to connect one."
            className="rounded-[12px] border-0 bg-inset/50 py-8 shadow-none"
          />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {chats.map((chat) => (
              <ChatTile
                key={chat.id}
                chat={chat}
                disconnecting={disconnectChat.isPending && disconnectChat.variables === chat.id}
                onDisconnect={() => handleDisconnect(chat.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatTile({
  chat,
  disconnecting,
  onDisconnect,
}: {
  chat: ConnectedChat;
  disconnecting: boolean;
  onDisconnect: () => void;
}) {
  const platform = toChatPlatform(chat.platform);
  const title = chat.title?.trim() || "Telegram chat";
  const telegramUrl =
    chat.chatType === "private" && chat.title?.startsWith("@")
      ? `https://t.me/${chat.title.slice(1)}`
      : `https://t.me/${TELEGRAM_BOT_USERNAME}`;

  return (
    <div className="flex items-center gap-3 rounded-[13px] border border-hairline bg-inset/40 p-3 transition-colors hover:bg-inset">
      <PlatformTile platform={platform} className="size-9 rounded-[10px]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-semibold text-foreground">{title}</span>
          <span className="size-1.5 shrink-0 rounded-full bg-emerald" />
        </div>
        <div className="truncate text-[11.5px] text-content-faint">{formatChatMeta(chat)}</div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Manage chat"
            disabled={disconnecting}
            className="t-press flex size-8 shrink-0 items-center justify-center rounded-lg text-content-muted hover:bg-card hover:text-foreground disabled:opacity-50"
          >
            <Icon icon={MoreHorizontalIcon} size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px] rounded-[13px]">
          <DropdownMenuItem asChild>
            <a href={telegramUrl} target="_blank" rel="noreferrer">
              <Icon icon={ArrowRight01Icon} size={15} />
              Open in Telegram
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-deep focus:bg-rose-soft focus:text-rose-deep"
            disabled={disconnecting}
            onSelect={onDisconnect}
          >
            <Icon icon={Delete02Icon} size={15} />
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ComingSoonStrip({ integration }: { integration: Integration }) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-[16px] border border-dashed border-hairline bg-inset/40 p-4">
      <PlatformTile platform={integration.platform} className="size-11 opacity-70 grayscale" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-semibold text-foreground">{integration.name}</span>
          <StatusPill status="neutral">Coming soon</StatusPill>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-content-muted">{integration.blurb}</p>
      </div>
      <Button className="w-full sm:w-auto" variant="secondary" size="sm" trailingIcon={<Icon icon={ArrowRight01Icon} size={14} />}>
        Notify me
      </Button>
    </div>
  );
}
