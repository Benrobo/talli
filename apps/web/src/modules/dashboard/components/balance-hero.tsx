import { useState } from "react";
import { motion } from "motion/react";
import { TallyWatermark } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ViewIcon,
  ViewOffIcon,
  WalletAdd01Icon,
  ArrowUpRight01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira } from "@/lib/format";

const EMPTY_JAR = "/illustrations/empty-jar.png";

interface BalanceHeroProps {
  amount: number;
  delta?: { value: string; direction: "up" | "down" } | null;
  onTopUp: () => void;
}

export function BalanceHero({ amount, delta, onTopUp }: BalanceHeroProps) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="band-iris relative flex flex-col overflow-hidden rounded-[22px] p-6 text-white shadow-hero">
      <TallyWatermark className="-left-6 top-2 size-44 text-white" opacity={0.1} />
      <img
        src={EMPTY_JAR}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-5 bottom-0 w-40 select-none opacity-95 drop-shadow-[0_16px_40px_rgba(40,20,90,0.35)]"
      />

      <div className="relative flex items-center gap-2">
        <span className="text-[13px] font-medium text-white/75">Total balance</span>
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
          className="t-press flex size-6 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Icon icon={hidden ? ViewOffIcon : ViewIcon} size={14} />
        </button>
      </div>

      <div className="relative mt-2 font-display text-[38px] font-extrabold leading-none tracking-[-0.03em]">
        {hidden ? "₦ ••••••" : formatNaira(amount)}
      </div>

      <div className="relative mt-3 flex items-center gap-2 text-[12px]">
        {delta ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-white/18 px-2 py-0.5 font-semibold tabular text-white">
            <Icon icon={ArrowUpRight01Icon} size={12} className={delta.direction === "down" ? "rotate-90" : ""} />
            {delta.value}
          </span>
        ) : null}
        <span className="text-white/65">vs last month</span>
      </div>

      <div className="relative mt-5">
        <motion.button
          type="button"
          onClick={onTopUp}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 480, damping: 20 }}
          className="inline-flex items-center gap-2 rounded-[13px] border border-white/25 bg-white/15 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md transition-colors hover:bg-white/25"
        >
          <Icon icon={WalletAdd01Icon} size={17} />
          Top up
        </motion.button>
      </div>
    </div>
  );
}
