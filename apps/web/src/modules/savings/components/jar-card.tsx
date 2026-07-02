import { Link } from "@tanstack/react-router";
import { cn } from "@app/ui";
import { Card, Pressable } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { SquareLock02Icon, ArrowRight01Icon } from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira, formatNairaShort, toPercent } from "@/lib/format";
import { jarIconFor } from "@/modules/savings/jar-style";
import type { Jar } from "@/modules/savings/types";

interface JarCardProps {
  jar: Jar;
}

function moodFor(pct: number, empty: boolean): string {
  if (empty) return "Let's begin";
  if (pct >= 100) return "Goal reached 🎉";
  if (pct >= 90) return "So close — one more push";
  if (pct >= 60) return "More than halfway";
  if (pct >= 25) return "Building nicely";
  return "Off to a good start";
}

export function JarCard({ jar }: JarCardProps) {
  const pct = toPercent(jar.savedMinor, jar.targetMinor);
  const locked = jar.status === "locked";
  const empty = jar.savedMinor === 0;
  const reached = pct >= 100;
  const accent = jar.accentColor;
  const remaining = Math.max(0, jar.targetMinor - jar.savedMinor);

  return (
    <Pressable className="h-full">
      <Link to="/app/savings/$id" params={{ id: jar.id }} className="block h-full">
        <Card className="group relative h-full gap-0 overflow-hidden">
          <div className="relative flex items-start gap-3.5">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-[15px] text-white shadow-chip"
              style={{ backgroundColor: accent }}
            >
              <Icon icon={jarIconFor(jar.icon)} size={23} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="truncate font-display text-[15.5px] font-bold tracking-[-0.01em] text-foreground">
                  {jar.name}
                </span>
                {locked ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[10.5px] font-semibold text-amber-deep">
                    <Icon icon={SquareLock02Icon} size={11} />
                    Locked
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 text-[12px] font-medium" style={{ color: accent }}>
                {moodFor(pct, empty)}
              </div>
            </div>
          </div>

          <div className="relative mt-4">
            <div className="flex items-baseline justify-between">
              <span className="tabular font-display text-[22px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
                {formatNaira(jar.savedMinor)}
              </span>
              <span className="tabular text-[12px] text-content-faint">
                of {formatNairaShort(jar.targetMinor)}
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, backgroundColor: accent }}
              />
            </div>
          </div>

          <div className="relative mt-4 flex items-center justify-between border-t border-hairline-soft pt-3.5">
            <span className="tabular text-[11.5px] text-content-muted">
              {locked ? (
                <span className="text-amber-deep">{jar.lockText}</span>
              ) : reached ? (
                "Ready to enjoy"
              ) : empty ? (
                "Add your first deposit"
              ) : (
                `${formatNairaShort(remaining)} to go`
              )}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold"
              style={{ color: accent }}
            >
              {empty ? "Start saving" : "Add money"}
              <Icon
                icon={ArrowRight01Icon}
                size={14}
                className={cn("transition-transform duration-300 group-hover:translate-x-0.5")}
              />
            </span>
          </div>
        </Card>
      </Link>
    </Pressable>
  );
}
