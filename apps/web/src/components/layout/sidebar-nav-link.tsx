import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps extends LinkProps {
  className?: string;
  children: ReactNode;
}

const BASE =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors";

/**
 * Sidebar nav item with distinct hover (inactive) and active styles via TanStack
 * Router's activeProps / inactiveProps so classes never fight each other.
 */
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
        className:
          "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      }}
      activeProps={{
        className:
          "bg-sidebar-primary text-sidebar-primary-foreground shadow-btn hover:bg-sidebar-primary",
      }}
    >
      {children}
    </Link>
  );
}
