import { cn } from "@app/ui";
import type { ReactNode } from "react";
import { Topbar } from "./topbar";
import { MobileBottomNav } from "./mobile-bottom-nav";

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className="h-dvh overflow-hidden bg-canvas lg:p-3">
      <div className="mx-auto flex h-full max-w-[1680px] flex-col overflow-hidden bg-card lg:rounded-[24px] lg:border lg:border-hairline lg:shadow-card">
        <Topbar />
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <main
            className={cn(
              "h-full overflow-x-hidden overflow-y-auto bg-inset/60 px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8",
              className
            )}
          >
            <div className="w-full">{children}</div>
          </main>
          <div
            data-bottom-sheet-root
            className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
          />
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
