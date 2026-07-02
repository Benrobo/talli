import { useState } from "react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMe } from "@/api/http/v1/auth/auth.hooks";
import { useWalletMetrics, useWithdrawWallet } from "@/api/http/v1/wallet/wallet.hooks";
import { HomeSkeleton } from "@/components/skeleton-loaders";
import { cn } from "@/lib/utils";
import { Button, ProgressBar, StatusPill, FadeIn, UserAvatar } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import {
  ArrowUpRight01Icon,
  ArrowRight01Icon,
  Coins01Icon,
  MoneyReceive01Icon,
  MoneySavingJarIcon,
  MoneySend01Icon,
  PlusSignIcon,
  RefreshIcon,
  UserGroup02Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { Tick02Icon } from "@benrobo/iconary/core/solid-rounded";
import { formatNaira, formatNairaShort, toPercent } from "@/lib/format";
import type { ActivityItem } from "@/modules/dashboard/types";
import { BalanceHero } from "@/modules/dashboard/components/balance-hero";
import { TopUpSheet } from "@/modules/dashboard/components/top-up-sheet";
import { WithdrawToBankSheet } from "@/modules/payments/components/withdraw-to-bank-sheet";

dayjs.extend(relativeTime);

const JAR_WITH_COIN = "/illustrations/jar-with-coin.png";
const HIGH_FIVE = "/illustrations/high-five.png";

type ActivityTone = "emerald" | "iris" | "amber" | "rose";

interface ReasonMeta {
  icon: IconData;
  tone: ActivityTone;
  label: (amount: string) => string;
  link: ActivityItem["link"];
}

const REASON_META: Record<string, ReasonMeta> = {
  topup: {
    icon: MoneyReceive01Icon,
    tone: "emerald",
    label: (a) => `You topped up ${a} to your wallet`,
    link: { to: "/app/home" },
  },
  collection: {
    icon: Coins01Icon,
    tone: "iris",
    label: (a) => `Collection received ${a}`,
    link: { to: "/app/collections" },
  },
  savings_deposit: {
    icon: MoneySavingJarIcon,
    tone: "amber",
    label: (a) => `You saved ${a} to your jar`,
    link: { to: "/app/savings" },
  },
  savings_withdrawal: {
    icon: MoneySavingJarIcon,
    tone: "amber",
    label: (a) => `You withdrew ${a} from your jar`,
    link: { to: "/app/savings" },
  },
  send: {
    icon: ArrowUpRight01Icon,
    tone: "iris",
    label: (a) => `You sent ${a} from wallet`,
    link: { to: "/app/sent" },
  },
  refund: {
    icon: RefreshIcon,
    tone: "rose",
    label: (a) => `${a} refunded to your wallet`,
    link: { to: "/app/home" },
  },
};

const FALLBACK_META: ReasonMeta = {
  icon: Coins01Icon,
  tone: "iris",
  label: (a) => `Wallet activity ${a}`,
  link: { to: "/app/home" },
};

const TONE_COLOR: Record<ActivityTone, string> = {
  emerald: "bg-emerald-soft text-emerald-deep",
  iris: "bg-iris-soft text-iris-deep",
  amber: "bg-amber-soft text-amber-deep",
  rose: "bg-rose-soft text-rose-deep",
};

function greeting(): string {
  const hour = dayjs().hour();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function transactionToActivity(transaction: {
  reason: string;
  amount: number;
  createdAt: string;
}): ActivityItem {
  const when = dayjs(transaction.createdAt).fromNow();
  const amount = formatNaira(transaction.amount);
  const meta = REASON_META[transaction.reason] ?? FALLBACK_META;
  return {
    reason: transaction.reason,
    text: meta.label(amount),
    who: amount,
    when,
    link: meta.link,
  };
}

export function HomePage() {
  const { data: meResponse } = useMe();
  const { data: metricsResponse, isLoading: metricsLoading } = useWalletMetrics();
  const metrics = metricsResponse?.data;
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const withdrawWallet = useWithdrawWallet();

  if (metricsLoading && !metrics) {
    return <HomeSkeleton />;
  }

  const activity = (metrics?.recentTransactions ?? []).map(transactionToActivity);
  const jars = metrics?.topJars ?? [];
  const activeCollection = metrics?.activeCollection;

  const me = meResponse?.data.user;
  const firstName = me?.name?.trim().split(/\s+/)[0] || "there";

  const totalBalance = metrics?.totalBalance.amount ?? 0;
  const savedAcrossJars = metrics?.savedAcrossJars.amount ?? 0;
  const activeJars = metrics?.savedAcrossJars.activeJars ?? 0;
  const collectingNow = metrics?.collectingNow.amount ?? 0;
  const collectionsCount = metrics?.collectingNow.collectionsCount ?? 0;
  const sentThisMonth = metrics?.sentThisMonth.amount ?? 0;
  const transfersCount = metrics?.sentThisMonth.transfersCount ?? 0;

  const hasCollection = !!activeCollection;
  const activeCollected = activeCollection?.collected ?? 0;
  const activeTarget = activeCollection?.targetAmount ?? 0;
  const activePerPerson = activeCollection?.amountPerMember ?? 0;
  const activePaidMembers = activeCollection?.paidMembers ?? 0;
  const activeMembers = activeCollection?.totalMembers ?? 0;

  return (
    <div>
      <FadeIn
        className="mb-5 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-center"
        y={8}
      >
        <div className="flex items-center gap-3">
          <UserAvatar seed={me?.email || me?.name} size={46} />
          <div>
            <div className="text-[12.5px] font-medium text-content-faint">{greeting()} 👋</div>
            <h1 className="text-[21px] font-bold leading-tight tracking-[-0.02em] sm:text-[24px]">
              Welcome back, {firstName}
            </h1>
          </div>
        </div>
        <div className="self-start sm:self-auto">
          <Link to="/app/collections">
            <Button leadingIcon={<Icon icon={PlusSignIcon} size={16} />}>New collection</Button>
          </Link>
        </div>
      </FadeIn>

      <FadeIn delay={0.06} className="gap-3.5 md:columns-2 md:gap-3.5 lg:columns-3">
        <div className="mb-3.5 break-inside-avoid">
          <BalanceHero
            amount={totalBalance}
            delta={metrics?.totalBalance.delta ?? undefined}
            onTopUp={() => setTopUpOpen(true)}
            onWithdraw={() => setWithdrawOpen(true)}
          />
        </div>
        <div className="mb-3.5 break-inside-avoid">
          <CollectionCard
            hasCollection={hasCollection}
            title={activeCollection?.title ?? ""}
            status={activeCollection?.status ?? "active"}
            collected={activeCollected}
            target={activeTarget}
            perPerson={activePerPerson}
            paidMembers={activePaidMembers}
            totalMembers={activeMembers}
            totalCollections={collectionsCount}
          />
        </div>
        <div className="mb-3.5 break-inside-avoid">
          <QuickActions onTopUp={() => setTopUpOpen(true)} />
        </div>
        <div className="mb-3.5 break-inside-avoid">
          <ActivityPanel activity={activity} />
        </div>
        <div className="mb-3.5 break-inside-avoid">
          <JarsPanel jars={jars} />
        </div>
        <div className="mb-3.5 break-inside-avoid">
          <InviteCard />
        </div>
      </FadeIn>

      <TopUpSheet open={topUpOpen} onOpenChange={setTopUpOpen} />
      <WithdrawToBankSheet
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title="Withdraw to bank"
        available={totalBalance}
        submitting={withdrawWallet.isPending}
        onSubmit={async ({ amount, accountNumber, bankName }) => {
          const res = await withdrawWallet.mutateAsync({ amount, accountNumber, bankName });
          return {
            status: res.data.status,
            amount: res.data.amount,
            accountName: res.data.accountName,
            bankName: res.data.bankName,
          };
        }}
      />
    </div>
  );
}

function QuickActions({ onTopUp }: { onTopUp: () => void }) {
  const actions: {
    label: string;
    desc: string;
    icon: IconData;
    accent: string;
    onClick?: () => void;
    to?: "/app/collections" | "/app/savings" | "/app/sent";
  }[] = [
    { label: "New collection", desc: "Gather dues or split a bill", icon: UserGroup02Icon, accent: "#6d4ae6", to: "/app/collections" },
    { label: "Create a jar", desc: "Save toward a goal", icon: MoneySavingJarIcon, accent: "#d9902b", to: "/app/savings" },
    { label: "Send money", desc: "Transfer to any bank", icon: MoneySend01Icon, accent: "#22c55e", to: "/app/sent" },
    { label: "Top up wallet", desc: "Add money by transfer", icon: Coins01Icon, accent: "#0ea5e9", onClick: onTopUp },
  ];

  return (
    <div className="overflow-hidden rounded-[22px] border border-hairline bg-card shadow-card">
      <div className="px-5 pb-1 pt-5 text-[13px] font-semibold text-foreground">Quick actions</div>
      <div className="flex flex-col">
        {actions.map((action) => {
          const inner = (
            <>
              <span
                className="flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ color: action.accent }}
              >
                <Icon icon={action.icon} size={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                  {action.label}
                </span>
                <span className="block truncate text-[11.5px] text-content-faint">{action.desc}</span>
              </span>
              <Icon
                icon={ArrowRight01Icon}
                size={16}
                className="shrink-0 -translate-x-1 text-content-faint opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              />
            </>
          );
          const cls =
            "group relative flex items-center gap-3 border-t border-hairline-soft px-5 py-3 text-left transition-colors hover:bg-inset/60";
          const rail = (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100"
              style={{ backgroundColor: action.accent }}
            />
          );
          return action.to ? (
            <Link key={action.label} to={action.to} className={cls}>
              {rail}
              {inner}
            </Link>
          ) : (
            <button key={action.label} type="button" onClick={action.onClick} className={cls}>
              {rail}
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CollectionCard({
  hasCollection,
  title,
  status,
  collected,
  target,
  perPerson,
  paidMembers,
  totalMembers,
  totalCollections,
}: {
  hasCollection: boolean;
  title: string;
  status: string;
  collected: number;
  target: number;
  perPerson: number;
  paidMembers: number;
  totalMembers: number;
  totalCollections: number;
}) {
  if (!hasCollection) {
    return (
      <Link
        to="/app/collections"
        className="group relative flex h-full items-center overflow-hidden rounded-[22px] border border-hairline bg-card p-6 shadow-card"
      >
        <img
          src={JAR_WITH_COIN}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-4 bottom-0 w-40 select-none opacity-90"
        />
        <div className="relative max-w-[62%]">
          <div className="mb-1 font-display text-[18px] font-bold tracking-[-0.01em]">
            Start your first collection
          </div>
          <p className="text-[12.5px] leading-relaxed text-content-muted">
            Gather dues, split a bill, or fundraise — money lands straight in your wallet.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-iris-deep">
            Create a collection
            <Icon icon={ArrowRight01Icon} size={14} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    );
  }

  const pct = toPercent(collected, target);

  return (
    <Link
      to="/app/collections"
      className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-hairline bg-card p-6 shadow-card"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-medium text-content-muted">
          Active collection
          {totalCollections > 1 ? (
            <span className="text-content-faint"> · {totalCollections - 1} more</span>
          ) : null}
        </span>
        <StatusPill status="info" dot>
          {status.replaceAll("_", " ")}
        </StatusPill>
      </div>
      <div className="mb-1 text-[19px] font-bold leading-tight tracking-[-0.01em]">{title}</div>
      <div className="mb-5 text-[12.5px] text-content-muted">{formatNaira(perPerson)} / person</div>

      <div>
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="tabular font-display text-[24px] font-bold tracking-[-0.02em]">
            {formatNaira(collected)}
          </span>
          <span className="tabular text-[12px] text-content-muted">of {formatNaira(target)}</span>
        </div>
        <ProgressBar value={pct} className="h-2" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hairline-soft pt-4">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-content-muted">
            <Icon icon={Tick02Icon} size={14} strokeWidth={2.5} className="text-emerald-deep" />
            {paidMembers} of {totalMembers} paid
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-iris-deep">
            View collection
            <Icon icon={ArrowRight01Icon} size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function JarsPanel({ jars }: { jars: { id: string; name: string; saved: number; target: number }[] }) {
  return (
    <div className="flex flex-col rounded-[22px] border border-hairline bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground">Your jars</span>
        <Link
          to="/app/savings"
          className="inline-flex items-center gap-0.5 text-[12px] font-medium text-iris-deep"
        >
          All jars
          <Icon icon={ArrowRight01Icon} size={13} />
        </Link>
      </div>

      {jars.length === 0 ? (
        <Link
          to="/app/savings"
          className="flex flex-1 flex-col items-center justify-center rounded-[14px] border border-dashed border-hairline bg-inset/40 px-5 py-6 text-center transition-colors hover:bg-inset/70"
        >
          <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
            <Icon icon={MoneySavingJarIcon} size={22} />
          </span>
          <span className="text-[13.5px] font-semibold text-foreground">Start a jar</span>
          <span className="mt-1 max-w-[220px] text-[12px] text-content-muted">
            Set money aside for something that matters to you.
          </span>
        </Link>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {jars.map((jar) => {
              const pct = toPercent(jar.saved, jar.target);
              return (
                <Link key={jar.id} to="/app/savings/$id" params={{ id: jar.id }} className="block rounded-lg">
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-medium">{jar.name}</span>
                    <span className="tabular text-content-muted">
                      {formatNairaShort(jar.saved)} / {formatNairaShort(jar.target)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ProgressBar value={pct} className="h-1.5 flex-1" />
                    <span className="tabular w-8 text-right text-[11px] font-medium text-content-faint">
                      {pct}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {jars.length < 3 ? (
            <div className="mt-auto flex flex-col items-center pt-6 text-center">
              <img
                src={JAR_WITH_COIN}
                alt=""
                aria-hidden
                className="pointer-events-none mb-2 w-28 select-none opacity-90"
              />
              <p className="max-w-[220px] text-[12px] leading-relaxed text-content-muted">
                More jars will appear here as you start saving for your goals.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ActivityPanel({ activity }: { activity: ActivityItem[] }) {
  return (
    <div className="flex flex-col rounded-[22px] border border-hairline bg-card shadow-card">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <span className="text-[13px] font-semibold text-foreground">Recent activity</span>
        <span className="text-[11.5px] text-content-faint">24h</span>
      </div>
      <div className="border-t border-hairline-soft">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <span className="mb-2.5 flex size-11 items-center justify-center rounded-full bg-inset text-content-faint">
              <Icon icon={Coins01Icon} size={19} />
            </span>
            <span className="text-[12.5px] font-medium text-content-muted">No activity yet</span>
            <span className="mt-0.5 max-w-[180px] text-[11.5px] leading-relaxed text-content-faint">
              Your money moves — paid, saved, sent — show up here.
            </span>
          </div>
        ) : (
          activity.map((item, index) => (
            <ActivityRow key={`${item.text}-${item.when}`} item={item} last={index === activity.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityRow({ item, last }: { item: ActivityItem; last: boolean }) {
  const meta = REASON_META[item.reason] ?? FALLBACK_META;
  return (
    <Link
      to={item.link.to}
      params={"params" in item.link ? item.link.params : undefined}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-inset",
        !last && "border-b border-hairline-soft"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[11px]",
          TONE_COLOR[meta.tone],
        )}
        >
        <Icon icon={meta.icon} size={18} color="currentColor" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1 text-[12.5px] leading-snug">{renderActivityText(item)}</div>
      <div className="tabular shrink-0 text-[10.5px] text-content-faint">{item.when}</div>
    </Link>
  );
}

function renderActivityText({ text, who }: ActivityItem) {
  const index = text.indexOf(who);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <b className="font-semibold">{who}</b>
      {text.slice(index + who.length)}
    </>
  );
}

function InviteCard() {
  return (
    <Link
      to="/app/integrations"
      className="group relative flex items-center gap-3 overflow-hidden rounded-[22px] border border-iris-soft bg-iris-soft/40 p-4"
    >
      <img
        src={HIGH_FIVE}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-2 -right-3 w-24 select-none opacity-90"
      />
      <div className="relative max-w-[62%]">
        <div className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-bold text-iris-deep">
          Earn ₦100
        </div>
        <div className="font-display text-[14px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          Invite a friend
        </div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-content-muted">
          You both get ₦100 when they join Talli.
        </p>
      </div>
    </Link>
  );
}
