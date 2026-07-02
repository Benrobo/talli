import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface TopbarNavLinkProps extends LinkProps {
  className?: string;
  children: ReactNode;
}

const BASE =
  "flex items-center gap-1.5 whitespace-nowrap rounded-[11px] px-3 py-2 text-[13px] font-medium transition-colors";

export function TopbarNavLink({ className, children, activeOptions, ...props }: TopbarNavLinkProps) {
  return (
    <Link
      {...props}
      activeOptions={activeOptions}
      className={cn(BASE, className)}
      inactiveProps={{ className: "text-content-muted hover:bg-inset hover:text-foreground" }}
      activeProps={{ className: "bg-iris-soft font-semibold text-iris-deep" }}
    >
      {children}
    </Link>
  );
}
