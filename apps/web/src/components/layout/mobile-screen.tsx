import { cn } from "@app/ui";
import type { ReactNode } from "react";

interface MobileScreenProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function MobileScreen({ children, className, footer }: MobileScreenProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8">
      <div className="flex w-full max-w-[400px] flex-col">
        <div className={cn("flex flex-col", className)}>{children}</div>
        {footer ? <div className="pt-5">{footer}</div> : null}
      </div>
    </div>
  );
}
