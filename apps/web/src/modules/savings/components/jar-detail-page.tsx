import { Link } from "@tanstack/react-router";
import { Badge, Button, Card, RingProgress } from "@/components/ui";
import {
  ArrowLeft01Icon,
  Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@app/icons";
import { formatNaira, toPercent } from "@/lib/format";
import type { Jar } from "@/modules/savings/types";

interface JarDetailPageProps {
  jar: Jar;
}

/** Savings jar detail — progress, unlock, and recent deposits (screen 4a). */
export function JarDetailPage({ jar }: JarDetailPageProps) {
  const pct = toPercent(jar.savedMinor, jar.targetMinor);
  return (
    <div>
      <Link
        to="/savings"
        className="mb-[18px] inline-flex items-center gap-1.5 text-[13px] text-content-muted"
      >
        <Icon data={ArrowLeft01Icon} size={15} />
        Savings jars
      </Link>

      <div className="mb-6 flex items-center justify-center gap-3">
        <h1 className="text-[15px] font-medium">{jar.name}</h1>
        {jar.status === "locked" ? (
          <Badge tone="amber">LOCKED</Badge>
        ) : (
          <Badge tone="iris">ACTIVE</Badge>
        )}
      </div>

      <div className="mb-6 flex justify-center">
        <RingProgress value={pct} size={180} thickness={20}>
          <span className="text-[12px] text-content-muted">saved</span>
          <span className="tabular my-0.5 text-[26px] font-bold tracking-[-0.02em]">
            {formatNaira(jar.savedMinor)}
          </span>
          <span className="tabular text-[12px] text-content-muted">
            of {formatNaira(jar.targetMinor)}
          </span>
        </RingProgress>
      </div>

      <div className="mb-6 flex gap-3">
        <Card className="flex-1 text-center">
          <div className="mb-[5px] text-[11.5px] text-content-muted">Progress</div>
          <div className="tabular text-[19px] font-bold">{pct}%</div>
        </Card>
        <Card className="flex-1 text-center">
          <div className="mb-[5px] text-[11.5px] text-content-muted">Unlocks</div>
          <div className="tabular text-[19px] font-bold">
            {jar.status === "locked" ? "Jul 30" : "—"}
          </div>
        </Card>
      </div>

      <div className="mb-[11px] font-mono text-[10.5px] uppercase tracking-[0.1em] text-content-faint">
        Recent deposits
      </div>
      <Card padded={false} className="mb-6 overflow-hidden">
        {jar.deposits.map((deposit, index) => (
          <div
            key={deposit.when}
            className={
              index === jar.deposits.length - 1
                ? "flex items-center justify-between px-4 py-3"
                : "flex items-center justify-between border-b border-hairline-soft px-4 py-3"
            }
          >
            <div>
              <div className="tabular text-[13.5px] font-medium">
                + {formatNaira(deposit.amountMinor)}
              </div>
              <div className="tabular text-[11.5px] text-content-faint">{deposit.when}</div>
            </div>
            <Icon data={Tick02Icon} size={16} className="text-iris-deep" />
          </div>
        ))}
      </Card>

      <Button block size="lg" leadingIcon={<Icon data={PlusSignIcon} size={16} />}>
        Add money
      </Button>
    </div>
  );
}
