import type { ReactNode } from "react";
import { Icon } from "@benrobo/iconary/react";
import { AlertCircleIcon, RefreshIcon } from "@benrobo/iconary/core/duotone-rounded";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn’t load this right now. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex min-h-[50vh] items-center justify-center px-2 sm:px-6", className)}>
      <div className="w-full max-w-[400px] rounded-[22px] border border-hairline bg-card px-4 py-10 text-center shadow-card sm:px-8 sm:py-12">
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-rose-soft text-rose-deep shadow-chip">
          <Icon icon={AlertCircleIcon} size={30} />
        </span>
        <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] leading-relaxed text-content-muted">
          {description}
        </p>
        {onRetry ? (
          <Button className="mt-6" variant="secondary" leadingIcon={<Icon icon={RefreshIcon} size={15} />} onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
