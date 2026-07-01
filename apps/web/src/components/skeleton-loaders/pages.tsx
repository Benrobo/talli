import { Skeleton } from "@/components/ui";
import {
  SkeletonCard,
  SkeletonGrid,
  SkeletonHeader,
  SkeletonStatCard,
  SkeletonTable,
} from "./ui";

export function HomeSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-[38px] rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-[12px]" />
      </div>
      <div className="mb-4">
        <SkeletonGrid count={4}>{() => <SkeletonStatCard />}</SkeletonGrid>
      </div>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.35fr_1fr]">
        <SkeletonCard lines={4} className="h-full" />
        <SkeletonCard lines={4} className="h-full" />
      </div>
      <div className="mt-3.5">
        <SkeletonTable rows={3} />
      </div>
    </div>
  );
}

export function CollectionsSkeleton() {
  return (
    <div>
      <SkeletonHeader />
      <div className="mb-5">
        <SkeletonGrid count={3} cols="sm:grid-cols-3">
          {() => <SkeletonStatCard />}
        </SkeletonGrid>
      </div>
      <SkeletonGrid count={4} cols="sm:grid-cols-2">
        {() => <SkeletonCard lines={2} />}
      </SkeletonGrid>
    </div>
  );
}

export function CollectionDetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-[18px] h-4 w-28" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 rounded-[12px]" />
          <Skeleton className="h-10 w-28 rounded-[12px]" />
        </div>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-[1.3fr_1fr_1fr]">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <SkeletonTable rows={4} />
    </div>
  );
}

export function SavingsSkeleton() {
  return (
    <div>
      <SkeletonHeader />
      <div className="mb-5">
        <SkeletonGrid count={3} cols="sm:grid-cols-3">
          {() => <SkeletonStatCard />}
        </SkeletonGrid>
      </div>
      <SkeletonGrid count={3} cols="sm:grid-cols-3">
        {() => <SkeletonCard lines={2} />}
      </SkeletonGrid>
    </div>
  );
}

export function JarDetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-[18px] h-4 w-24" />
      <div className="mb-6 space-y-2.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-[1.3fr_1fr_1fr]">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <SkeletonTable rows={4} />
    </div>
  );
}

export function SentSkeleton() {
  return (
    <div>
      <SkeletonHeader />
      <div className="mb-5">
        <SkeletonGrid count={3} cols="sm:grid-cols-3">
          {() => <SkeletonStatCard />}
        </SkeletonGrid>
      </div>
      <SkeletonTable rows={6} />
    </div>
  );
}

export function ReceiptsSkeleton() {
  return (
    <div>
      <SkeletonHeader />
      <div className="mb-5">
        <SkeletonGrid count={3} cols="sm:grid-cols-3">
          {() => <SkeletonStatCard />}
        </SkeletonGrid>
      </div>
      <SkeletonTable rows={6} />
    </div>
  );
}

export function IntegrationsSkeleton() {
  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-6 space-y-2.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <SkeletonCard lines={4} />
      <div className="mt-4">
        <SkeletonCard lines={2} />
      </div>
    </div>
  );
}

export function SplitSkeleton() {
  return (
    <div>
      <SkeletonHeader />
      <SkeletonGrid count={4} cols="sm:grid-cols-2">
        {() => <SkeletonCard lines={2} />}
      </SkeletonGrid>
    </div>
  );
}
