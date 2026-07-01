import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps extends LinkProps {
  className?: string;
  children: ReactNode;
}

const BASE =
  "flex items-center gap-2.5 rounded-[6px] px-3 py-[7px] text-[13px] font-medium transition-colors";

export function SidebarNavLink({
  className,
  children,
  activeOptions,
  ...props
}: SidebarNavLinkProps) {
  return (
    <Link
      {...props}
      activeOptions={activeOptions}
      className={cn(BASE, className)}
      inactiveProps={{
        className: "text-content-muted hover:bg-muted/50 hover:text-foreground",
      }}
      activeProps={{
        className: "bg-iris-soft font-semibold text-iris-deep",
      }}
    >
      {children}
    </Link>
  );
}
