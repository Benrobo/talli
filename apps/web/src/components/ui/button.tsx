import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-btn hover:bg-primary/90",
        destructive:
          "border border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10",
        outline:
          "border border-input bg-card text-foreground shadow-sm hover:bg-muted/60",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-[14px] px-5 text-[15px]",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ShadcnVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type LegacyVariant = "primary" | "danger";
type ButtonVariant = ShadcnVariant | LegacyVariant;

const LEGACY_VARIANT_MAP: Record<LegacyVariant, ShadcnVariant> = {
  primary: "default",
  danger: "destructive",
};

function resolveVariant(variant?: ButtonVariant): ShadcnVariant {
  if (!variant) return "default";
  if (variant in LEGACY_VARIANT_MAP) {
    return LEGACY_VARIANT_MAP[variant as LegacyVariant];
  }
  return variant as ShadcnVariant;
}

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "variant"> {
  asChild?: boolean;
  variant?: ButtonVariant;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  block?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  leadingIcon,
  trailingIcon,
  block,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const resolvedVariant = resolveVariant(variant);

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant: resolvedVariant, size, className }),
        block && "w-full",
        leadingIcon && "ps-3",
        trailingIcon && "pe-3"
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </Comp>
  );
}

export { Button, buttonVariants };
