import { cn } from "@app/ui";
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className="h-dvh overflow-hidden bg-canvas p-3">
      <div className="mx-auto flex h-full max-w-[1440px] overflow-hidden rounded-[24px] border border-hairline bg-card shadow-card">
        <Sidebar />
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <main className={cn("h-full overflow-y-auto bg-inset/60 px-7 py-6", className)}>
            <div className="mx-auto max-w-[1080px]">{children}</div>
          </main>
          <div
            data-bottom-sheet-root
            className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
          />
        </div>
      </div>
    </div>
  );
}
