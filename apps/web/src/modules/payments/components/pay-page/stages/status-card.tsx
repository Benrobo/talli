import type { ReactNode } from "react";
import { TallyWatermark } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";

export function StatusCard({
  icon,
  title,
  children,
}: {
  icon: IconData;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-hairline bg-card px-6 py-12 text-center shadow-card">
      <TallyWatermark className="-right-8 -top-8 size-36 text-iris" opacity={0.06} />
      <div className="relative">
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-rose-soft text-rose-deep shadow-chip">
          <Icon icon={icon} size={30} />
        </span>
        <h2 className="font-display text-[21px] font-bold tracking-[-0.02em]">{title}</h2>
        <div className="mx-auto mt-2 max-w-[310px] text-[13.5px] leading-relaxed text-content-muted">
          {children}
        </div>
      </div>
    </div>
  );
}
