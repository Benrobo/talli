import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[18px] border border-hairline bg-card p-5 shadow-card", className)}>
      <div className="mb-4 flex items-start justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-10 rounded-[12px]" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-3.5 h-4 w-20 rounded-full" />
    </div>
  );
}

export function SkeletonCard({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("rounded-[18px] border border-hairline bg-card p-5 shadow-card", className)}>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10 rounded-[12px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonListRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-[18px] py-3.5", className)}>
      <Skeleton className="size-9 rounded-[11px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-hairline bg-card shadow-card">
      <div className="divide-y divide-hairline-soft">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonListRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonHeader({ withActions = true }: { withActions?: boolean }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      {withActions ? <Skeleton className="h-10 w-32 rounded-[12px]" /> : null}
    </div>
  );
}

export function SkeletonGrid({
  count = 4,
  cols = "sm:grid-cols-2 xl:grid-cols-4",
  children,
}: {
  count?: number;
  cols?: string;
  children: (i: number) => React.ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3.5", cols)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{children(i)}</div>
      ))}
    </div>
  );
}
