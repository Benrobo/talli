import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import { SearchRemoveIcon } from "@benrobo/iconary/core/duotone-rounded";
import { Button, TallyWatermark } from "@/components/ui";
import { cn } from "@/lib/utils";

interface NotFoundStateProps {
  title?: string;
  description?: ReactNode;
  icon?: IconData;
  backTo?: string;
  backLabel?: string;
  action?: ReactNode;
  className?: string;
}

export function NotFoundState({
  title = "We couldn’t find that",
  description = "It may have been removed, or the link is out of date.",
  icon = SearchRemoveIcon,
  backTo,
  backLabel = "Go back",
  action,
  className,
}: NotFoundStateProps) {
  return (
    <div className={cn("flex min-h-[62vh] items-center justify-center px-2 sm:px-6", className)}>
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[22px] border border-hairline bg-card px-4 py-10 text-center shadow-card sm:px-8 sm:py-12">
        <TallyWatermark className="-right-8 -top-8 size-36 text-iris" opacity={0.06} />
        <div className="relative">
          <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep shadow-chip">
            <Icon icon={icon} size={30} />
          </span>
          <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-foreground">{title}</h2>
          <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] leading-relaxed text-content-muted">
            {description}
          </p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            {backTo ? (
              <Button asChild variant={action ? "secondary" : "default"}>
                <Link to={backTo}>{backLabel}</Link>
              </Button>
            ) : null}
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
