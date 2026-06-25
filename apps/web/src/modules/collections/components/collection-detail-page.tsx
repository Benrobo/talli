import { Link } from "@tanstack/react-router";
import { cn } from "@app/ui";
import { Badge, Button, Card, ProgressBar, StatCard } from "@/components/ui";
import {
  ArrowLeft01Icon,
  BellDotIcon,
  Icon,
  Share01Icon,
} from "@app/icons";
import { formatNaira } from "@/lib/format";
import { MemberRow } from "@/modules/collections/components/member-row";
import type { Collection } from "@/modules/collections/types";

interface CollectionDetailPageProps {
  collection: Collection;
}

/** Collection detail — who's paid, who hasn't (screen 2b). */
export function CollectionDetailPage({ collection }: CollectionDetailPageProps) {
  return (
    <div>
      <Link
        to="/collections"
        className="mb-[18px] inline-flex items-center gap-1.5 text-[13px] text-content-muted"
      >
        <Icon data={ArrowLeft01Icon} size={15} />
        Collections
      </Link>

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="font-serif text-[35px] leading-none tracking-[-0.01em]">
              {collection.title}
            </h1>
            <Badge tone="iris">LIVE</Badge>
          </div>
          <div className="text-[14px] text-content-muted">
            {formatNaira(collection.perPersonMinor)} from each of {collection.memberCount}{" "}
            members · due {collection.due}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/pay/$reference" params={{ reference: collection.payReference }}>
            <Button
              variant="secondary"
              leadingIcon={<Icon data={Share01Icon} size={16} />}
            >
              Share pay link
            </Button>
          </Link>
          <Button leadingIcon={<Icon data={BellDotIcon} size={16} />}>
            Remind 8 unpaid
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[1.3fr_1fr_1fr] gap-3.5">
        <StatCard tone="night" label="Collected so far" value={formatNaira(1_200_000)}>
          <ProgressBar
            value={33}
            className="mt-3.5 h-1.5"
            trackClassName="bg-white/15"
            barClassName="bg-white"
          />
          <div className="tabular mt-2 text-[11.5px] text-on-night">33% of ₦36,000</div>
        </StatCard>
        <StatCard label="Paid" value="4 / 12" />
        <StatCard label="Still owing" value={formatNaira(2_400_000)} />
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline-soft px-5 py-4">
          <span className="text-[14px] font-medium">Members</span>
          <span className="text-[12px] text-content-faint">4 paid · 1 paying · 7 to go</span>
        </div>
        <div className="grid grid-cols-2">
          {collection.members.map((member, index) => (
            <MemberRow
              key={member.name}
              member={member}
              className={cn(
                "border-b border-hairline-soft",
                index % 2 === 0 && "border-r border-hairline-soft"
              )}
            />
          ))}
          <div className="col-span-2 flex items-center gap-3 px-[19px] py-[13px]">
            <span className="flex-1 text-[13px] font-medium text-iris-deep">
              + 5 more unpaid
            </span>
            <span className="tabular text-[12px] text-content-faint">
              {formatNaira(1_500_000)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
