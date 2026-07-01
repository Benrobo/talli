import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPill = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
  {
    variants: {
      status: {
        success: "bg-emerald-500/10 text-emerald-600",
        pending: "bg-amber-soft text-amber-deep",
        neutral: "bg-[rgba(25,23,38,0.05)] text-content-muted",
        info: "bg-iris-soft text-iris-deep",
        danger: "bg-rose-soft/25 text-rose",
      },
    },
    defaultVariants: { status: "neutral" },
  }
);

interface StatusPillProps extends VariantProps<typeof statusPill> {
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const DOT: Record<NonNullable<StatusPillProps["status"]>, string> = {
  success: "bg-emerald-500",
  pending: "bg-amber",
  neutral: "bg-content-faint",
  info: "bg-iris",
  danger: "bg-rose",
};

export function StatusPill({ status, dot, className, children }: StatusPillProps) {
  const s = status ?? "neutral";
  return (
    <span className={cn(statusPill({ status: s }), className)}>
      {dot ? <span className={cn("size-1.5 rounded-full", DOT[s])} /> : null}
      {children}
    </span>
  );
}
