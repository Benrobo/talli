import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps extends LinkProps {
  className?: string;
  children: ReactNode;
}

const BASE =
  "group relative flex items-center gap-2.5 rounded-[11px] px-3 py-[9px] text-[13px] font-medium transition-colors";

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
        className: "text-content-muted hover:bg-inset hover:text-foreground [&_.nav-dot]:opacity-0",
      }}
      activeProps={{
        className: "bg-iris-soft font-semibold text-iris-deep [&_.nav-dot]:opacity-100",
      }}
    >
      <span className="nav-dot absolute left-0 h-4 w-[3px] rounded-full bg-iris transition-opacity" />
      {children}
    </Link>
  );
}
