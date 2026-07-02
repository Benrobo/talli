import type { ReactNode } from "react";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: IconData;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[15px] border border-dashed border-hairline bg-card/40 px-4 py-10 text-center sm:px-6 sm:py-14",
        className
      )}
    >
      {icon ? (
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-content-muted">
          <Icon icon={icon} size={26} />
        </span>
      ) : null}
      <div className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">{title}</div>
      {description ? (
        <p className="mt-1.5 max-w-[320px] text-[13.5px] text-content-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
