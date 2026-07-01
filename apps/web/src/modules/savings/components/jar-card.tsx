import { Link } from "@tanstack/react-router";
import { Card, RingProgress, StatusPill, Pressable } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { SquareLock02Icon, ArrowRight01Icon } from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira, formatNairaShort, toPercent } from "@/lib/format";
import type { Jar } from "@/modules/savings/types";

interface JarCardProps {
  jar: Jar;
}

export function JarCard({ jar }: JarCardProps) {
  const pct = toPercent(jar.savedMinor, jar.targetMinor);
  const locked = jar.status === "locked";
  const empty = jar.savedMinor === 0;

  return (
    <Pressable className="h-full">
      <Link to="/app/savings/$id" params={{ id: jar.id }} className="block h-full">
        <Card className="group h-full gap-0">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-foreground">{jar.name}</span>
            {locked ? (
              <StatusPill status="pending">Locked</StatusPill>
            ) : (
              <StatusPill status="success">Active</StatusPill>
            )}
          </div>

          <div className="flex items-center gap-4">
            <RingProgress value={pct} size={72} thickness={9} className="shrink-0">
              <span className="tabular text-[14px] font-bold tracking-[-0.02em] text-foreground">
                {pct}%
              </span>
            </RingProgress>

            <div className="min-w-0">
              <div className="tabular text-[20px] font-bold tracking-[-0.02em] text-foreground">
                {formatNaira(jar.savedMinor)}
              </div>
              <div className="tabular mt-0.5 text-[12px] text-content-muted">
                of {formatNaira(jar.targetMinor)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-hairline-soft pt-3.5">
            <span className="inline-flex items-center gap-1.5 text-[11.5px]">
              {locked ? (
                <>
                  <Icon icon={SquareLock02Icon} size={13} className="text-amber-deep" />
                  <span className="text-amber-deep">{jar.lockText}</span>
                </>
              ) : (
                <span className="tabular text-content-faint">
                  {empty
                    ? "start saving"
                    : `${formatNairaShort(jar.targetMinor - jar.savedMinor)} to go`}
                </span>
              )}
            </span>
            <span className="text-content-faint">
              <Icon icon={ArrowRight01Icon} size={15} />
            </span>
          </div>
        </Card>
      </Link>
    </Pressable>
  );
}
