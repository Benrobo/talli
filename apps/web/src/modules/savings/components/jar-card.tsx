import { Link } from "@tanstack/react-router";
import { Badge, Card, RingProgress } from "@/components/ui";
import { formatNaira, toPercent } from "@/lib/format";
import type { Jar } from "@/modules/savings/types";

interface JarCardProps {
  jar: Jar;
}

/** Single savings jar tile linking to its detail screen (screen 2d). */
export function JarCard({ jar }: JarCardProps) {
  const pct = toPercent(jar.savedMinor, jar.targetMinor);
  return (
    <Link to="/savings/$id" params={{ id: jar.id }} className="block">
      <Card>
        <div className="mb-[18px] flex items-center justify-between">
          <span className="text-[15px] font-medium">{jar.name}</span>
          {jar.status === "locked" ? (
            <Badge tone="amber">LOCKED</Badge>
          ) : (
            <Badge tone="iris">ACTIVE</Badge>
          )}
        </div>
        <div className="mb-4 flex justify-center">
          <RingProgress value={pct} size={104}>
            <span className="tabular text-[17px] font-bold">{pct}%</span>
          </RingProgress>
        </div>
        <div className="tabular text-center text-[19px] font-bold tracking-[-0.02em]">
          {formatNaira(jar.savedMinor)}
        </div>
        <div className="tabular mt-[3px] text-center text-[12px] text-content-muted">
          of {formatNaira(jar.targetMinor)} · {jar.lockText}
        </div>
      </Card>
    </Link>
  );
}
