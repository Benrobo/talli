import { cn } from "@app/ui";
import type { ReactNode } from "react";

interface MobileScreenProps {
  children: ReactNode;
  className?: string;
  /** Sticky footer area (primary action), kept pinned to the bottom. */
  footer?: ReactNode;
}

/**
 * Full-height, phone-width container for the standalone consumer flows
 * (connect a chat, pay, receipt). Renders as a real responsive page rather
 * than a decorative device bezel.
 */
export function MobileScreen({ children, className, footer }: MobileScreenProps) {
  return (
    <div className="flex min-h-dvh justify-center bg-screen">
      <div className="flex w-full max-w-[420px] flex-col">
        <div className={cn("flex flex-1 flex-col px-6 pt-10", className)}>{children}</div>
        {footer ? <div className="px-6 pb-8 pt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
