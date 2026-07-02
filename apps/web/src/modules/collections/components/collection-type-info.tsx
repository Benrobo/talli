import { cn } from "@app/ui";
import { InfoTooltip } from "@/components/hint";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import {
  ChartLineData01Icon,
  GiftIcon,
  InformationCircleIcon,
  Link01Icon,
  ListViewIcon,
  Money01Icon,
  SparklesIcon,
  Target01Icon,
  Tap01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserListIcon,
  UserMultiple02Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira } from "@/lib/format";
import type { Collection, CollectionType } from "@/modules/collections/types";

type Tone = "iris" | "emerald" | "amber";

interface Tip {
  icon: IconData;
  text: string;
}

interface TypeMeta {
  icon: IconData;
  tone: Tone;
  label: string;
  quote: (collection: Collection) => { lead: string; highlight: string | null; tail: string };
  tips: Tip[];
}

const CHIP: Record<Tone, string> = {
  iris: "bg-iris-soft text-iris-deep",
  emerald: "bg-emerald-soft text-emerald-deep",
  amber: "bg-amber-soft text-amber-deep",
};

const LABEL: Record<Tone, string> = {
  iris: "text-iris-deep",
  emerald: "text-emerald-deep",
  amber: "text-amber-deep",
};

const QUOTE_BAR: Record<Tone, string> = {
  iris: "bg-iris",
  emerald: "bg-emerald",
  amber: "bg-amber",
};

const QUOTE_BG: Record<Tone, string> = {
  iris: "bg-iris-soft/50",
  emerald: "bg-emerald-soft/50",
  amber: "bg-amber-soft/50",
};

const MARK: Record<Tone, string> = {
  iris: "bg-iris text-white",
  emerald: "bg-emerald text-white",
  amber: "bg-amber text-white",
};

const TIP_ICON: Record<Tone, string> = {
  iris: "text-iris-deep",
  emerald: "text-emerald-deep",
  amber: "text-amber-deep",
};

const TYPE_META: Record<CollectionType, TypeMeta> = {
  fixed_per_person: {
    icon: UserMultiple02Icon,
    tone: "iris",
    label: "Fixed per person",
    quote: (collection) => ({
      lead: "Everyone owes the same",
      highlight: collection.perPersonMinor > 0 ? formatNaira(collection.perPersonMinor) : null,
      tail: collection.perPersonMinor > 0 ? "each." : "set amount each.",
    }),
    tips: [
      { icon: Link01Icon, text: "Share one pay link with the whole group" },
      { icon: Tap01Icon, text: "Each person taps their name and pays their share" },
      { icon: ChartLineData01Icon, text: "See who has paid and who still owes, live" },
    ],
  },
  open_contribution: {
    icon: Target01Icon,
    tone: "emerald",
    label: "Open contribution",
    quote: (collection) => ({
      lead: "People chip in any amount toward your",
      highlight: collection.targetMinor > 0 ? formatNaira(collection.targetMinor) : null,
      tail: "target.",
    }),
    tips: [
      { icon: Money01Icon, text: "No fixed amount — givers choose what to give" },
      { icon: GiftIcon, text: "Perfect for gifts, fundraisers and support" },
      { icon: SparklesIcon, text: "Progress fills toward your target as money lands" },
    ],
  },
  named_members: {
    icon: UserListIcon,
    tone: "amber",
    label: "Named members",
    quote: () => ({
      lead: "Each person is listed by name with their",
      highlight: "own share",
      tail: "to pay.",
    }),
    tips: [
      { icon: UserAdd01Icon, text: "Add members and set what each one owes" },
      { icon: ListViewIcon, text: "Everyone pays only their own share" },
      { icon: UserCheck01Icon, text: "See exactly who has cleared and who is left" },
    ],
  },
};

export function CollectionTypeInfo({
  collection,
  className,
}: {
  collection: Collection;
  className?: string;
}) {
  const meta = TYPE_META[collection.collectionType];
  if (!meta) return null;

  const quote = meta.quote(collection);

  return (
    <InfoTooltip
      theme="light"
      side="bottom"
      align="end"
      maxWidth={300}
      content={
        <div className="w-[272px] py-0.5">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[11px]",
                CHIP[meta.tone]
              )}
            >
              <Icon icon={meta.icon} size={17} />
            </span>
            <div className="min-w-0">
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-content-faint">
                Collection type
              </div>
              <div
                className={cn(
                  "font-display text-[14.5px] font-bold leading-tight tracking-[-0.01em]",
                  LABEL[meta.tone]
                )}
              >
                {meta.label}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "mt-3 flex gap-2.5 rounded-r-[10px] rounded-l-[4px] py-2 pl-2.5 pr-3",
              QUOTE_BG[meta.tone]
            )}
          >
            <span className={cn("w-[3px] shrink-0 rounded-full", QUOTE_BAR[meta.tone])} />
            <p className="text-[12px] italic leading-relaxed text-foreground/80">
              {quote.lead}{" "}
              {quote.highlight ? (
                <span
                  className={cn(
                    "mx-0.5 inline-block rounded-[6px] px-1.5 py-px font-display text-[11.5px] font-bold not-italic tabular",
                    MARK[meta.tone]
                  )}
                >
                  {quote.highlight}
                </span>
              ) : null}{" "}
              {quote.tail}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {meta.tips.map((tip) => (
              <div key={tip.text} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-[7px] bg-inset",
                    TIP_ICON[meta.tone]
                  )}
                >
                  <Icon icon={tip.icon} size={12} />
                </span>
                <span className="text-[11.5px] leading-[1.45] text-content-muted">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <button
        type="button"
        aria-label="How this collection works"
        className={cn(
          "flex size-7 items-center justify-center rounded-full bg-white/15 text-white/90 transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
          className
        )}
      >
        <Icon icon={InformationCircleIcon} size={16} />
      </button>
    </InfoTooltip>
  );
}
