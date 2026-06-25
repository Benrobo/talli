import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.04em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        destructive: "border-transparent bg-destructive/15 text-destructive",
        outline: "border-border text-foreground",
        iris: "border-transparent bg-accent text-accent-foreground",
        amber: "border-transparent bg-amber-soft text-amber-deep",
        neutral: "border-transparent bg-[rgba(25,23,38,0.06)] text-muted-foreground",
        rose: "border-transparent bg-rose-soft/40 text-rose",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type LegacyTone = "iris" | "amber" | "neutral" | "rose";

interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  tone?: LegacyTone;
  dot?: boolean;
}

const TONE_VARIANT: Record<LegacyTone, VariantProps<typeof badgeVariants>["variant"]> = {
  iris: "iris",
  amber: "amber",
  neutral: "neutral",
  rose: "rose",
};

const DOT_CLASS: Record<LegacyTone, string> = {
  iris: "bg-primary",
  amber: "bg-amber",
  neutral: "bg-content-faint",
  rose: "bg-rose",
};

function Badge({
  className,
  variant,
  tone,
  dot,
  asChild = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  const resolvedVariant = variant ?? (tone ? TONE_VARIANT[tone] : "default");

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {dot && tone ? (
        <span className={cn("size-1.5 rounded-full", DOT_CLASS[tone])} />
      ) : null}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
