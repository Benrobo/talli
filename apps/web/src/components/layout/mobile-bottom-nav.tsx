import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@benrobo/iconary/react";
import { MoreHorizontalIcon } from "@benrobo/iconary/core/duotone-rounded";
import { BottomSheet } from "@/components/ui";
import { cn } from "@/lib/utils";
import { APP_NAV, MOBILE_MORE_NAV, MOBILE_NAV } from "./navigation";

const TAB_CONTENT =
  "relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 pt-2 pb-2.5 transition-colors after:absolute after:bottom-0 after:left-1/2 after:h-[3px] after:w-1/2 after:-translate-x-1/2 after:rounded-t-[4px] after:bg-iris after:opacity-0 after:transition-opacity after:content-['']";

export function MobileBottomNav() {
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const moreIsActive = MOBILE_MORE_NAV.some(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
  );

  return (
    <nav
      aria-label="App navigation"
      className="absolute inset-x-0 bottom-0 z-30 border-t border-hairline bg-card/95 px-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_-24px_rgba(27,24,48,0.4)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-[520px] grid-cols-4 px-1">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={item.exact ? { exact: true } : undefined}
            aria-label={item.label}
            className="group flex min-w-0 justify-center rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-iris/25"
            inactiveProps={{ className: "text-content-faint" }}
            activeProps={{ className: "font-semibold text-iris-deep [&>span]:after:opacity-100" }}
          >
            <motion.span
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              transition={{ type: "spring", stiffness: 520, damping: 28, mass: 0.55 }}
              className={TAB_CONTENT}
            >
              <Icon icon={item.icon} size={21} color="currentColor" />
              <span className="w-full truncate text-center text-[11px] font-semibold leading-none tracking-[-0.01em]">
                {item.mobileLabel}
              </span>
            </motion.span>
          </Link>
        ))}
        <motion.button
          type="button"
          aria-label="More navigation"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
          whileTap={reduceMotion ? undefined : { scale: 0.9 }}
          transition={{ type: "spring", stiffness: 520, damping: 28, mass: 0.55 }}
          className="flex min-w-0 justify-center rounded-xl text-content-faint outline-none focus-visible:ring-[3px] focus-visible:ring-iris/25"
        >
          <span
            className={cn(
              TAB_CONTENT,
              (moreOpen || moreIsActive) && "font-semibold text-iris-deep after:opacity-100"
            )}
          >
            <Icon icon={MoreHorizontalIcon} size={21} color="currentColor" />
            <span className="w-full truncate text-center text-[11px] font-semibold leading-none tracking-[-0.01em]">
              More
            </span>
          </span>
        </motion.button>
      </div>
      <MobileNavigationSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
      />
    </nav>
  );
}

interface MobileNavigationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MobileNavigationSheet({
  open,
  onOpenChange,
}: MobileNavigationSheetProps) {
  const reduceMotion = useReducedMotion();

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Navigate Talli"
      description="Choose where you want to go."
      className="sm:max-w-[460px]"
    >
      <div className="px-1 pb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-iris-deep">
          Navigate
        </div>
        <h2 className="mt-1 font-display text-[22px] font-bold tracking-[-0.025em] text-foreground">
          Everything in Talli
        </h2>
        <p className="mt-1 text-[12.5px] text-content-muted">
          Jump straight to what you need.
        </p>
      </div>
      <nav aria-label="All app navigation" className="grid grid-cols-3 gap-2">
        {APP_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={item.exact ? { exact: true } : undefined}
            onClick={() => onOpenChange(false)}
            className="group min-w-0 rounded-[16px] border border-hairline bg-inset/55 p-2 outline-none transition-colors hover:bg-inset focus-visible:ring-[3px] focus-visible:ring-iris/25"
            inactiveProps={{
              className: "text-content-muted",
            }}
            activeProps={{
              className:
                "border-iris/20 bg-iris-soft text-iris-deep shadow-soft [&_.nav-grid-icon]:bg-card [&_.nav-grid-icon]:shadow-chip",
            }}
          >
            <motion.span
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              transition={{ type: "spring", stiffness: 520, damping: 28, mass: 0.55 }}
              className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[12px] px-1 text-center"
            >
              <span className="nav-grid-icon flex size-10 items-center justify-center rounded-[13px] bg-card/70 text-current transition-colors">
                <Icon icon={item.icon} size={20} color="currentColor" />
              </span>
              <span className="w-full truncate text-[11.5px] font-semibold leading-tight">
                {item.mobileLabel}
              </span>
            </motion.span>
          </Link>
        ))}
      </nav>
    </BottomSheet>
  );
}
