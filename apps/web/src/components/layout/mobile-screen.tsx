import { cn } from "@app/ui";
import type { ReactNode } from "react";

interface MobileScreenProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

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
