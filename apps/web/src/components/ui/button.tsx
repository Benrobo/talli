import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ActivitySpinner } from "./activity-spinner";

const buttonVariants = cva(
  "t-press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[12px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "band-iris text-white shadow-btn",
        destructive: "border border-rose/25 bg-rose-soft text-rose-deep shadow-soft",
        outline: "grad-btn-white border border-hairline text-foreground shadow-btn-white",
        secondary: "grad-btn-white border border-hairline text-foreground shadow-btn-white",
        ghost: "text-content-muted hover:bg-muted/70 hover:text-foreground",
        link: "text-iris-deep underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 text-[13.5px]",
        sm: "h-8 px-3 text-[12.5px]",
        lg: "h-11 px-5 text-[14.5px]",
        icon: "size-10",
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
  loading?: boolean;
}

const SPINNER_SIZE = { sm: "sm", default: "sm", lg: "sm", icon: "sm" } as const;
const SPINNER_COLOR: Record<string, string> = {
  default: "bg-primary-foreground",
  secondary: "bg-foreground",
  outline: "bg-foreground",
  ghost: "bg-foreground",
  link: "bg-primary",
  destructive: "bg-destructive",
};

function Button({
  className,
  variant,
  size,
  asChild = false,
  leadingIcon,
  trailingIcon,
  block,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const resolvedVariant = resolveVariant(variant);

  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(
          buttonVariants({ variant: resolvedVariant, size, className }),
          block && "w-full",
          leadingIcon && "ps-3",
          trailingIcon && "pe-3"
        )}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      data-slot="button"
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant: resolvedVariant, size, className }),
        block && "w-full",
        leadingIcon && "ps-3",
        trailingIcon && "pe-3",
        loading && "relative"
      )}
      {...props}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <ActivitySpinner size={SPINNER_SIZE[size ?? "default"]} color={SPINNER_COLOR[resolvedVariant] ?? "bg-primary-foreground"} />
        </span>
      ) : null}
      <span className={cn("contents", loading && "invisible")}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </button>
  );
}

export { Button, buttonVariants };
