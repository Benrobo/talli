import { cn } from "@app/ui";
import type { ReactNode } from "react";
import { TalliLogo } from "@/components/brand/talli-logo";
import { TallyWatermark } from "@/components/ui";

interface MobileScreenProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  brand?: boolean;
}

export function MobileScreen({ children, className, footer, brand = true }: MobileScreenProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-8">
      {brand ? <BrandBackdrop /> : null}
      <div className="relative flex w-full max-w-[400px] flex-col">
        {brand ? (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-[16px] border border-hairline bg-card/75 px-3.5 py-2.5 shadow-soft backdrop-blur-sm">
              <TalliLogo alt="" className="h-9" />
              <div className="text-left">
                <div className="font-display text-[17px] font-bold leading-none tracking-[-0.025em] text-content">
                  Talli
                </div>
                <div className="mt-1 text-[10.5px] font-medium leading-none text-content-muted">
                  Money, handled together.
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className={cn("flex flex-col", className)}>{children}</div>
        {footer ? <div className="pt-5">{footer}</div> : null}
        {brand ? (
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-medium text-content-faint">
            Powered by
            <span className="font-display font-bold tracking-[-0.01em] text-content-muted">Talli</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BrandBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(109,74,230,0.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(120% 80% at 50% 0%, black 0%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(120% 80% at 50% 0%, black 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute -top-32 left-1/2 h-80 w-[560px] -translate-x-1/2 rounded-full opacity-60"
        style={{ background: "radial-gradient(closest-side, rgba(124,91,240,0.22), transparent)" }}
      />
      <TallyWatermark className="-left-10 top-24 size-52 text-iris" opacity={0.05} />
      <TallyWatermark className="-right-12 bottom-16 size-64 text-iris" opacity={0.04} />
    </div>
  );
}
