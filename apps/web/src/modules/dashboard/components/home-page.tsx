import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Button,
  Card,
  IconChip,
  ProgressBar,
  SectionCard,
  StatCard,
  StatusPill,
  Stagger,
  StaggerItem,
  FadeIn,
  Pressable,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import {
  ArrowUpRight01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  MoneySavingJarIcon,
  MoneySend01Icon,
  PlusSignIcon,
  Search01Icon,
  Wallet01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira, formatNairaShort, toPercent } from "@/lib/format";
import { homeData } from "@/data/mock/dashboard";
import type { ActivityItem, ActivityKind } from "@/modules/dashboard/types";

const ACTIVITY_ICONS: Record<ActivityKind, IconData> = {
  paid: CheckmarkCircle02Icon,
  sent: ArrowUpRight01Icon,
  saved: PlusSignIcon,
};

const ACTIVITY_TONES: Record<ActivityKind, "emerald" | "iris" | "amber"> = {
  paid: "emerald",
  sent: "iris",
  saved: "amber",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const {
    savedAcrossJars,
    activeJars,
    collectingNow,
    collectionsCount,
    sentThisMonth,
    transfersCount,
    activeCollection,
    jars,
    activity,
  } = homeData;

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: authApi.me, staleTime: 5 * 60 * 1000 });
  const firstName = me?.name?.trim().split(/\s+/)[0] || "there";

  const totalMoving = savedAcrossJars + collectingNow;

  return (
    <div>
      <FadeIn className="mb-6 flex flex-wrap items-center justify-between gap-4" y={8}>
        <div className="flex items-center gap-3">
          <Avatar name={me?.name ?? "Talli"} tone="iris" size="lg" />
          <div>
            <div className="text-[12.5px] font-medium text-content-faint">{greeting()}</div>
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em]">
              Welcome back, {firstName}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="hidden items-center gap-2 rounded-[12px] border border-hairline bg-inset px-3.5 sm:flex">
            <Icon icon={Search01Icon} size={16} className="text-content-faint" />
            <input
              placeholder="Search"
              className="h-10 w-44 bg-transparent text-[13px] text-foreground placeholder:text-content-faint focus:outline-none"
            />
          </label>
          <Link to="/collections">
            <Button leadingIcon={<Icon icon={PlusSignIcon} size={16} />}>New collection</Button>
          </Link>
        </div>
      </FadeIn>

      <Stagger className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            tone="filled"
            label="Total balance"
            value={formatNaira(totalMoving)}
            icon={Wallet01Icon}
            delta={{ value: "+3.2%", direction: "up" }}
            sub="vs last month"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Saved across jars"
            value={formatNaira(savedAcrossJars)}
            icon={MoneySavingJarIcon}
            delta={{ value: "+4.5%", direction: "up" }}
            sub={`${activeJars} active jars`}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Collecting now"
            value={formatNaira(collectingNow)}
            icon={Coins01Icon}
            delta={{ value: "+12%", direction: "up" }}
            sub={`${collectionsCount} collection`}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Sent this month"
            value={formatNaira(sentThisMonth)}
            icon={MoneySend01Icon}
            delta={{ value: "-2.1%", direction: "down" }}
            sub={`${transfersCount} transfer`}
          />
        </StaggerItem>
      </Stagger>

      <FadeIn delay={0.12} className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.35fr_1fr]">
        <Pressable className="h-full">
          <Link
            to="/collections/$slug"
            params={{ slug: activeCollection.slug }}
            className="block h-full"
          >
            <Card className="h-full">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] font-medium text-content-muted">Active collection</span>
                <StatusPill status="info" dot>
                  Live
                </StatusPill>
              </div>
              <div className="mb-1 text-[20px] font-bold leading-tight tracking-[-0.01em]">
                {activeCollection.title}
              </div>
              <div className="mb-5 text-[12.5px] text-content-muted">
                {formatNaira(activeCollection.perPerson)} / person · due {activeCollection.due}
              </div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="tabular text-[24px] font-bold tracking-[-0.02em]">
                  {formatNaira(activeCollection.collected)}
                </span>
                <span className="tabular text-[12px] text-content-muted">
                  of {formatNaira(activeCollection.target)}
                </span>
              </div>
              <ProgressBar
                value={toPercent(activeCollection.collected, activeCollection.target)}
                className="h-2"
              />
              <div className="mt-4 flex items-center justify-between border-t border-hairline-soft pt-4">
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-content-muted">
                  <Icon icon={CheckmarkCircle02Icon} size={15} className="text-emerald-deep" />
                  {activeCollection.paid} of {activeCollection.members} paid
                </span>
                <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-iris-deep">
                  View collection
                  <Icon icon={ArrowRight01Icon} size={15} />
                </span>
              </div>
            </Card>
          </Link>
        </Pressable>

        <SectionCard
          title="Your jars"
          action={
            <Link
              to="/savings"
              className="inline-flex items-center gap-0.5 text-[12px] font-medium text-iris-deep"
            >
              All jars
              <Icon icon={ArrowRight01Icon} size={13} />
            </Link>
          }
        >
          <div className="flex flex-col gap-4">
            {jars.map((jar) => {
              const pct = toPercent(jar.saved, jar.target);
              return (
                <Link
                  key={jar.id}
                  to="/savings/$id"
                  params={{ id: jar.id }}
                  className="group block rounded-lg"
                >
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
        </SectionCard>
      </FadeIn>

      <FadeIn delay={0.18} className="mt-3.5">
        <SectionCard
          title="Recent activity"
          action={<span className="text-[12px] text-content-faint">Last 24 hours</span>}
          flush
        >
          {activity.map((item, index) => (
            <ActivityRow key={item.text} item={item} last={index === activity.length - 1} />
          ))}
        </SectionCard>
      </FadeIn>
    </div>
  );
}

function ActivityRow({ item, last }: { item: ActivityItem; last: boolean }) {
  return (
    <Link
      to={item.link.to}
      params={"params" in item.link ? item.link.params : undefined}
      className={cn(
        "flex items-center gap-3 px-[18px] py-3.5 transition-colors hover:bg-inset",
        !last && "border-b border-hairline-soft"
      )}
    >
      <IconChip tone={ACTIVITY_TONES[item.kind]} size="md">
        <Icon icon={ACTIVITY_ICONS[item.kind]} size={16} />
      </IconChip>
      <div className="flex-1 text-[13.5px]">{renderActivityText(item)}</div>
      <div className="tabular text-[12px] text-content-faint">{item.when}</div>
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
