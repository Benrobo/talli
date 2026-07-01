import { cn } from "@app/ui";
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-dvh bg-screen">
      <div className="sticky top-0 h-dvh">
        <Sidebar />
      </div>
      <main className={cn("flex-1 overflow-x-hidden px-8 py-8", className)}>
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
