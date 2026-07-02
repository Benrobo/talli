import { IconChip } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { KIND_META } from "../transaction-meta";
import type { TransactionKind } from "@/api/http/v1/transactions/transactions.types";

const ICON_SIZE = { sm: 15, md: 17, lg: 20 } as const;

export function TransactionIcon({
  kind,
  size = "md",
}: {
  kind: TransactionKind;
  size?: "sm" | "md" | "lg";
}) {
  const meta = KIND_META[kind];
  return (
    <IconChip tone={meta.tone} size={size}>
      <Icon icon={meta.icon} size={ICON_SIZE[size]} />
    </IconChip>
  );
}
