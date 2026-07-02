import type { IconData } from "@benrobo/iconary/core";
import {
  Coins01Icon,
  MoneyReceive01Icon,
  MoneySavingJarIcon,
  MoneySend01Icon,
  RefreshIcon,
} from "@benrobo/iconary/core/duotone-rounded";
import {
  Cancel01Icon,
  Clock01Icon,
  Tick02Icon,
} from "@benrobo/iconary/core/solid-rounded";
import type {
  TransactionKind,
  TransactionRecord,
} from "@/api/http/v1/transactions/transactions.types";
import { formatNairaShort } from "@/lib/format";

export type ChipTone = "emerald" | "iris" | "amber" | "rose" | "neutral";

export interface KindMeta {
  icon: IconData;
  tone: ChipTone;
  label: string;
}

export const KIND_META: Record<TransactionKind, KindMeta> = {
  wallet_topup: { icon: MoneyReceive01Icon, tone: "emerald", label: "Wallet top-up" },
  collection_payment: { icon: Coins01Icon, tone: "iris", label: "Collection payment" },
  savings_deposit: { icon: MoneySavingJarIcon, tone: "amber", label: "Savings deposit" },
  savings_withdrawal: { icon: MoneySavingJarIcon, tone: "amber", label: "Savings withdrawal" },
  transfer_out: { icon: MoneySend01Icon, tone: "iris", label: "Money sent" },
  refund: { icon: RefreshIcon, tone: "rose", label: "Refund" },
};

export type StatusVariant = "success" | "pending" | "danger" | "neutral";

export interface StatusMeta {
  icon: IconData;
  variant: StatusVariant;
  label: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  successful: { icon: Tick02Icon, variant: "success", label: "Successful" },
  pending: { icon: Clock01Icon, variant: "pending", label: "Pending" },
  failed: { icon: Cancel01Icon, variant: "danger", label: "Failed" },
  cancelled: { icon: Cancel01Icon, variant: "neutral", label: "Cancelled" },
};

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? { icon: Clock01Icon, variant: "neutral", label: status };
}

export function rowSubtitle(row: TransactionRecord): string {
  if (row.collectionId) return "Collection";
  if (row.savingsJarId) return "Savings jar";
  if (row.transferId) return "Bank transfer";
  return row.direction === "credit" ? "Money in" : "Money out";
}

/**
 * A descriptive, human title for a transaction — what it's actually about, not just
 * the kind. e.g. "Sent ₦5k to Samuel", "Topped up ₦2,000", "Withdrew ₦10k".
 */
export function transactionTitle(row: TransactionRecord): string {
  const amount = formatNairaShort(row.amount);
  switch (row.kind) {
    case "transfer_out": {
      const to = row.recipient?.accountName;
      return to ? `Sent ${amount} to ${titleCaseName(to)}` : `Sent ${amount}`;
    }
    case "wallet_topup":
      return `Topped up ${amount}`;
    case "savings_deposit":
      return `Saved ${amount}`;
    case "savings_withdrawal":
      return `Withdrew ${amount} from savings`;
    case "collection_payment":
      return `Collected ${amount}`;
    case "refund":
      return `Refund of ${amount}`;
  }
}

/** Bank account names come UPPERCASE — soften to Title Case for a friendly title. */
function titleCaseName(name: string): string {
  const trimmed = name.trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
