import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Card,
  ProgressBar,
  StatCard,
} from "@/components/ui";
import {
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Icon,
  PlusSignIcon,
} from "@app/icons";
import type { IconData } from "@app/icons";
import { formatNaira, formatNairaShort, toPercent } from "@/lib/format";
import { homeData } from "@/data/mock/dashboard";
import type { ActivityItem, ActivityKind } from "@/modules/dashboard/types";

const ACTIVITY_ICONS: Record<ActivityKind, IconData> = {
  paid: CheckmarkCircle02Icon,
  sent: ArrowUpRight01Icon,
  saved: PlusSignIcon,
};

/** Dashboard Home — everything at a glance (screen 2a). */
export function HomePage() {
  const {
    savedAcrossJars,
    activeJars,
    collectingNow,
    collectingTarget,
    collectionsCount,
    sentThisMonth,
    transfersCount,
    activeCollection,
    jars,
    activity,
  } = homeData;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1.5 font-serif text-[31px] font-normal leading-none">
            Hi, Benaiah
          </h1>
          <div className="text-[13.5px] text-muted-foreground">
            Here's where your money is today.
          </div>
        </div>
        <Avatar name="Benaiah" tone="iris" size="lg" />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3.5">
        <Link to="/savings" className="block transition-opacity hover:opacity-95">
          <StatCard
            tone="night"
            label="Saved across jars"
            value={formatNaira(savedAcrossJars)}
            sub={`${activeJars} active jars`}
          />
        </Link>
        <Link to="/collections" className="block transition-opacity hover:opacity-95">
          <StatCard
            label="Collecting now"
            value={formatNaira(collectingNow)}
            sub={`of ${formatNaira(collectingTarget)} · ${collectionsCount} collection`}
          />
        </Link>
        <Link to="/sent" className="block transition-opacity hover:opacity-95">
          <StatCard
            label="Sent this month"
            value={formatNaira(sentThisMonth)}
            sub={`${transfersCount} transfer`}
          />
        </Link>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-3.5">
        <Link
          to="/collections/$slug"
          params={{ slug: activeCollection.slug }}
          className="block transition-opacity hover:opacity-95"
        >
          <Card className="h-full">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13.5px] font-medium">Active collection</span>
              <Badge tone="iris">LIVE</Badge>
            </div>
            <div className="mb-1 text-[15px] font-medium">{activeCollection.title}</div>
            <div className="mb-3.5 text-[12.5px] text-muted-foreground">
              {formatNaira(activeCollection.perPerson)} / person · due {activeCollection.due}
            </div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="tabular text-[18px] font-bold">
                {formatNaira(activeCollection.collected)}
              </span>
              <span className="tabular text-[12px] text-muted-foreground">
                Paid {activeCollection.paid} / {activeCollection.members}
              </span>
            </div>
            <ProgressBar
              value={toPercent(activeCollection.collected, activeCollection.target)}
            />
          </Card>
        </Link>

        <Card>
          <div className="mb-4 text-[13.5px] font-medium">Your jars</div>
          <div className="flex flex-col gap-3.5">
            {jars.map((jar) => (
              <Link
                key={jar.id}
                to="/savings/$id"
                params={{ id: jar.id }}
                className="block rounded-lg transition-colors hover:bg-muted/40"
              >
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="font-medium">{jar.name}</span>
                  <span className="tabular text-muted-foreground">
                    {formatNairaShort(jar.saved)} / {formatNairaShort(jar.target)}
                  </span>
                </div>
                <ProgressBar value={toPercent(jar.saved, jar.target)} className="h-1.5" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false} className="mt-3.5 overflow-hidden">
        <div className="border-b border-hairline-soft px-[17px] py-[13px] text-[13.5px] font-medium">
          Recent activity
        </div>
        {activity.map((item, index) => (
          <ActivityRow
            key={item.text}
            item={item}
            last={index === activity.length - 1}
          />
        ))}
      </Card>
    </div>
  );
}

interface ActivityRowProps {
  item: ActivityItem;
  last: boolean;
}

function ActivityRow({ item, last }: ActivityRowProps) {
  return (
    <Link
      to={item.link.to}
      params={"params" in item.link ? item.link.params : undefined}
      className={cn(
        "flex items-center gap-3 px-[17px] py-[11px] transition-colors hover:bg-muted/30",
        !last && "border-b border-hairline-soft"
      )}
    >
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon data={ACTIVITY_ICONS[item.kind]} size={16} />
      </span>
      <div className="flex-1 text-[13.5px]">{renderActivityText(item)}</div>
      <div className="text-[12px] text-muted-foreground">{item.when}</div>
    </Link>
  );
}

function renderActivityText({ text, who }: ActivityItem) {
  const index = text.indexOf(who);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <b className="font-medium">{who}</b>
      {text.slice(index + who.length)}
    </>
  );
}
