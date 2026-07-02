import { useEffect, useState } from "react";
import {
  BottomSheet,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import {
  ArrowDownLeft01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Coins01Icon,
  FilterHorizontalIcon,
  Layers01Icon,
  MoneyReceive01Icon,
  MoneySavingJarIcon,
  MoneySend01Icon,
  RefreshIcon,
  Search01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { cn } from "@/lib/utils";
import type { TransactionCounts } from "@/api/http/v1/transactions/transactions.types";
import type { DateRange, StatusFilter, TypeValue } from "./transactions-filters";

interface TypeOption {
  label: string;
  value: TypeValue;
  icon: IconData;
}

const TYPE_OPTIONS: TypeOption[] = [
  { label: "All", value: "all", icon: Layers01Icon },
  { label: "Money in", value: "in", icon: ArrowDownLeft01Icon },
  { label: "Money out", value: "out", icon: ArrowUpRight01Icon },
  { label: "Sent", value: "sent", icon: MoneySend01Icon },
  { label: "Saved", value: "saved", icon: MoneySavingJarIcon },
  { label: "Top-ups", value: "topup", icon: MoneyReceive01Icon },
  { label: "Collections", value: "collection", icon: Coins01Icon },
  { label: "Refunds", value: "refund", icon: RefreshIcon },
];

const DATE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "All time", value: "all" },
  { label: "This month", value: "month" },
  { label: "Last 30 days", value: "30d" },
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All statuses", value: "all" },
  { label: "Successful", value: "successful" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

export interface FilterState {
  type: TypeValue;
  dateRange: DateRange;
  status: StatusFilter;
}

interface Props {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filters: FilterState;
  counts?: TransactionCounts;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}

export function TransactionsFilterBar({
  searchInput,
  onSearchChange,
  filters,
  counts,
  onChange,
  onReset,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <DesktopFilters filters={filters} counts={counts} onChange={onChange} />

      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-faint">
            <Icon icon={Search01Icon} size={16} />
          </span>
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by reference"
            className="h-11 pl-10 text-[13.5px]"
          />
        </div>

        <MobileFilters filters={filters} counts={counts} onChange={onChange} onReset={onReset} />

        <div className="hidden items-center gap-2.5 md:flex">
          <Select value={filters.dateRange} onValueChange={(value) => onChange({ dateRange: value as DateRange })}>
            <SelectTrigger className="h-11 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => onChange({ status: value as StatusFilter })}>
            <SelectTrigger className="h-11 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function DesktopFilters({
  filters,
  counts,
  onChange,
}: Pick<Props, "filters" | "counts" | "onChange">) {
  return (
    <div className="-mx-1 hidden gap-2 overflow-x-auto px-1 pb-0.5 md:flex">
      {TYPE_OPTIONS.map((option) => {
        const active = filters.type === option.value;
        const count = counts?.[option.value] ?? 0;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange({ type: option.value })}
            className={cn(
              "t-press flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-2 text-[12.5px] font-medium transition-colors",
              active
                ? "border-transparent bg-foreground text-card"
                : "border-hairline bg-card text-content-muted hover:bg-inset"
            )}
          >
            <Icon icon={option.icon} size={15} />
            {option.label}
            <span
              className={cn(
                "tabular inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                active ? "bg-card/25 text-card" : "bg-inset text-content-faint"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MobileFilters({
  filters,
  counts,
  onChange,
  onReset,
}: Pick<Props, "filters" | "counts" | "onChange" | "onReset">) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(filters);

  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 768px)");
    if (mq.matches) {
      setOpen(false);
      return;
    }
    const onChangeViewport = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    mq.addEventListener("change", onChangeViewport);
    return () => mq.removeEventListener("change", onChangeViewport);
  }, [open]);

  const appliedCount =
    (filters.type !== "all" ? 1 : 0) +
    (filters.dateRange !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0);

  const draftCount =
    (draft.type !== "all" ? 1 : 0) +
    (draft.dateRange !== "all" ? 1 : 0) +
    (draft.status !== "all" ? 1 : 0);

  function openSheet() {
    setDraft(filters);
    setOpen(true);
  }

  function patchDraft(patch: Partial<FilterState>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function applyDraft() {
    onChange(draft);
    setOpen(false);
  }

  function clearDraft() {
    setDraft({ type: "all", dateRange: "all", status: "all" });
    onReset();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={cn(
          "t-press flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[13.5px] font-medium transition-colors md:hidden",
          appliedCount > 0
            ? "border-foreground bg-foreground text-card"
            : "border-hairline bg-card text-content-muted hover:bg-inset"
        )}
      >
        <Icon icon={FilterHorizontalIcon} size={17} />
        Filters
        {appliedCount > 0 ? (
          <span className="tabular inline-flex size-5 items-center justify-center rounded-full bg-card/25 text-[11px] font-semibold leading-none text-card">
            {appliedCount}
          </span>
        ) : null}
      </button>

      <BottomSheet open={open} onOpenChange={setOpen} title="Filters" className="max-w-[440px]">
        <div className="mb-4 flex items-center justify-between pr-8">
          <span className="font-display text-[17px] font-bold tracking-[-0.02em]">Filters</span>
          {draftCount > 0 ? (
            <button
              type="button"
              onClick={clearDraft}
              className="t-press flex items-center gap-1 text-[12.5px] font-medium text-content-muted hover:text-foreground"
            >
              <Icon icon={Cancel01Icon} size={13} />
              Clear all
            </button>
          ) : null}
        </div>

        <FilterGroup label="Type">
          <div className="grid grid-cols-2 gap-1.5">
            {TYPE_OPTIONS.map((option) => {
              const active = draft.type === option.value;
              const count = counts?.[option.value] ?? 0;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => patchDraft({ type: option.value })}
                  className={cn(
                    "t-press flex items-center gap-2 rounded-[10px] border px-2.5 py-2.5 text-left text-[13px] font-medium transition-colors",
                    active
                      ? "border-iris/40 bg-iris-soft text-iris-deep"
                      : "border-hairline bg-card text-content-muted hover:bg-inset"
                  )}
                >
                  <Icon icon={option.icon} size={16} className="shrink-0" />
                  <span className="flex-1 truncate">{option.label}</span>
                  <span
                    className={cn(
                      "tabular inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                      active ? "bg-iris/15 text-iris-deep" : "bg-inset text-content-faint"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </FilterGroup>

        <FilterGroup label="Date">
          <SegmentRow
            options={DATE_OPTIONS}
            value={draft.dateRange}
            onSelect={(value) => patchDraft({ dateRange: value })}
          />
        </FilterGroup>

        <FilterGroup label="Status">
          <SegmentRow
            options={STATUS_OPTIONS}
            value={draft.status}
            onSelect={(value) => patchDraft({ status: value })}
          />
        </FilterGroup>

        <Button block size="lg" className="mt-6" onClick={applyDraft}>
          Apply filters
        </Button>
      </BottomSheet>
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-content-faint">
        {label}
      </div>
      {children}
    </div>
  );
}

function SegmentRow<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: T }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              "t-press rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              active
                ? "border-transparent bg-foreground text-card"
                : "border-hairline bg-card text-content-muted hover:bg-inset"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
