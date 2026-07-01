import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FadeIn,
  PageHeader,
  SectionCard,
  Stagger,
  StaggerItem,
  StatusPill,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  Copy01Icon,
  Link01Icon,
  PlusSignIcon,
  TelegramIcon,
  WhatsappIcon,
} from "@benrobo/iconary/core/duotone-rounded";
import type { IconData } from "@benrobo/iconary/core";
import { PlatformTile } from "@/modules/chats/components/platform-tile";
import { linkedChats, linkCode } from "@/data/mock/chats";
import type { ChatPlatform, LinkedChat } from "@/modules/chats/types";

interface Integration {
  platform: ChatPlatform;
  name: string;
  icon: IconData;
  blurb: string;
}

const INTEGRATIONS: Integration[] = [
  {
    platform: "whatsapp",
    name: "WhatsApp",
    icon: WhatsappIcon,
    blurb: "Split bills and send money right inside a WhatsApp chat.",
  },
  {
    platform: "telegram",
    name: "Telegram",
    icon: TelegramIcon,
    blurb: "Run group collections and dues from any Telegram group.",
  },
];

export function ChatsPage() {
  const [connect, setConnect] = useState<Integration | null>(null);
  const countFor = (p: ChatPlatform) => linkedChats.filter((c) => c.platform === p).length;

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect a chat so Talli can collect, split, and send for this workspace."
      />

      <FadeIn>
        <div className="mb-6 grid grid-cols-2 gap-3.5">
          {INTEGRATIONS.map((it) => {
            const connected = countFor(it.platform);
            return (
              <div
                key={it.platform}
                className="flex flex-col rounded-[15px] border border-hairline bg-card p-5 shadow-card"
              >
                <div className="mb-4 flex items-start justify-between">
                  <PlatformTile platform={it.platform} />
                  {connected ? (
                    <StatusPill status="success" dot>
                      Connected
                    </StatusPill>
                  ) : (
                    <StatusPill status="neutral">Not connected</StatusPill>
                  )}
                </div>
                <div className="text-[16px] font-semibold">{it.name}</div>
                <p className="mt-1 mb-4 flex-1 text-[13px] leading-relaxed text-content-muted">
                  {it.blurb}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-content-faint">
                    {connected ? `${connected} chat${connected > 1 ? "s" : ""} linked` : "No chats yet"}
                  </span>
                  <Button
                    size="sm"
                    variant={connected ? "secondary" : "default"}
                    leadingIcon={<Icon icon={PlusSignIcon} size={15} />}
                    onClick={() => setConnect(it)}
                  >
                    {connected ? "Add another" : "Connect"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <SectionCard
          title="Connected chats"
          action={<span className="text-[12px] text-content-faint">{linkedChats.length} active</span>}
          flush
        >
          {linkedChats.length === 0 ? (
            <EmptyState
              icon={Link01Icon}
              title="No chats connected"
              description="Connect WhatsApp or Telegram above to let Talli act in your chats."
              className="border-0"
            />
          ) : (
            <Stagger>
              {linkedChats.map((chat) => (
                <StaggerItem key={chat.id}>
                  <ConnectedRow chat={chat} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </SectionCard>
      </FadeIn>

      <ConnectDialog integration={connect} code={linkCode} onClose={() => setConnect(null)} />
    </div>
  );
}

function ConnectedRow({ chat }: { chat: LinkedChat }) {
  return (
    <div className="flex items-center gap-3.5 border-b border-hairline-soft px-[18px] py-3.5 last:border-b-0">
      <PlatformTile platform={chat.platform} className="size-9 rounded-[11px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{chat.title}</div>
        <div className="truncate text-[12px] text-content-muted">{chat.meta}</div>
      </div>
      <StatusPill status="success" dot>
        Active
      </StatusPill>
      <Button variant="ghost" size="sm">
        Manage
      </Button>
    </div>
  );
}

function ConnectDialog({
  integration,
  code,
  onClose,
}: {
  integration: Integration | null;
  code: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Dialog open={!!integration} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        {integration ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex justify-center">
                <PlatformTile platform={integration.platform} className="size-12 rounded-2xl" />
              </div>
              <DialogTitle className="text-center text-[20px] font-bold tracking-[-0.01em]">
                Connect {integration.name}
              </DialogTitle>
              <DialogDescription className="text-center">
                Send this code to the Talli bot on {integration.name} to link this workspace.
              </DialogDescription>
            </DialogHeader>

            <button
              onClick={copy}
              className="mt-2 flex items-center justify-between rounded-xl border border-hairline bg-muted/40 px-4 py-3.5 transition-colors hover:bg-muted/60"
            >
              <span className="tabular font-mono text-[18px] font-semibold tracking-[0.12em]">
                {code}
              </span>
              <span
                className={
                  copied
                    ? "flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-white"
                    : "flex size-8 items-center justify-center rounded-lg bg-iris-soft text-iris-deep"
                }
              >
                <Icon icon={Copy01Icon} size={15} />
              </span>
            </button>

            <ol className="mt-4 space-y-2.5 text-[13px] text-content-muted">
              <li className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-iris-soft text-[11px] font-semibold text-iris-deep">
                  1
                </span>
                Open {integration.name} and start a chat with the Talli bot.
              </li>
              <li className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-iris-soft text-[11px] font-semibold text-iris-deep">
                  2
                </span>
                Paste the code above. Talli links it to this workspace instantly.
              </li>
            </ol>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
