import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  divider?: boolean;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className,
  divider = true,
}: ListRowProps) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      className={cn(
        "flex items-center gap-3 px-[17px] py-3 transition-colors",
        divider && "border-b border-hairline-soft last:border-b-0",
        interactive && "cursor-pointer hover:bg-muted/40",
        className
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-foreground">{title}</div>
        {subtitle ? (
          <div className="truncate text-[12.5px] text-content-muted">{subtitle}</div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
    </div>
  );
}
