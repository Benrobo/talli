import { motion } from "motion/react";
import { cn } from "@app/ui";
import { Button } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { Icon } from "@benrobo/iconary/react";
import {
  PlusSignIcon,
  UserIcon,
} from "@benrobo/iconary/core/duotone-rounded";
import {
  Tick02Icon,
  TickDouble02Icon,
} from "@benrobo/iconary/core/solid-rounded";
import { formatNaira } from "@/lib/format";
import type { CollectionPayMember } from "@/api/http/v1/collections/collections.types";
import {
  CheckoutSecureFooter,
} from "@/modules/payments/components/nomba-checkout-ui";
import { SECURE_NOTE } from "../constants";

export function MemberPicker({
  title,
  payTo,
  targetAmount,
  members,
  remaining,
  isOpenContribution,
  selectedMemberId,
  amount,
  submitting,
  onSelect,
  onContinue,
  onNewPayer,
}: {
  title: string;
  payTo: string;
  targetAmount: number | null;
  members: CollectionPayMember[];
  remaining: number;
  isOpenContribution: boolean;
  selectedMemberId: string | null;
  amount: number;
  submitting: boolean;
  onSelect: (member: CollectionPayMember) => void;
  onContinue: () => void;
  onNewPayer: () => void;
}) {
  const noMembers = members.length === 0;
  const canContinue = !!selectedMemberId || (isOpenContribution && noMembers);

  return (
    <MobileScreen
      footer={
        <motion.div initial={false} animate={{ opacity: canContinue ? 1 : 0.55 }}>
          <Button block size="lg" disabled={submitting || !canContinue} onClick={onContinue}>
            {selectedMemberId
              ? isOpenContribution
                ? "Continue"
                : `Pay ${formatNaira(amount)}`
              : isOpenContribution && noMembers
                ? "Continue"
                : "Select your name"}
          </Button>
          <CheckoutSecureFooter note={SECURE_NOTE} />
        </motion.div>
      }
    >
      <div className="overflow-hidden rounded-[22px] border border-hairline bg-card shadow-card">
        <SheetHeader
          title={title}
          payTo={payTo}
          remaining={remaining}
          total={members.length}
          isOpenContribution={isOpenContribution}
          targetAmount={targetAmount}
        />
        <div className="flex flex-col gap-2.5 p-4">
          {members.length > 0 ? (
            members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                selected={selectedMemberId === member.id}
                isOpenContribution={isOpenContribution}
                onSelect={() => onSelect(member)}
              />
            ))
          ) : (
            <div className="rounded-[14px] border border-dashed border-hairline px-4 py-8 text-center text-[13px] text-content-muted">
              {isOpenContribution
                ? "Tap below to contribute with your name and amount."
                : "No members listed yet. Tap below to pay with your name."}
            </div>
          )}
          <button
            type="button"
            onClick={onNewPayer}
            className="flex items-center justify-center gap-1.5 rounded-[14px] border border-hairline bg-inset px-4 py-3 text-[13px] font-medium text-iris-deep"
          >
            <Icon icon={PlusSignIcon} size={14} />
            {members.length > 0 ? "Someone else" : "Pay with my name"}
          </button>
        </div>
      </div>
    </MobileScreen>
  );
}

function SheetHeader({
  title,
  payTo,
  remaining,
  total,
  isOpenContribution,
  targetAmount,
}: {
  title: string;
  payTo: string;
  remaining: number;
  total: number;
  isOpenContribution: boolean;
  targetAmount: number | null;
}) {
  return (
    <div className="border-b border-hairline-soft p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-content-muted">Collection</div>
          <div className="mt-0.5 truncate font-display text-[23px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            {title}
          </div>
          <div className="mt-1 text-[12.5px] text-content-faint">To {payTo}</div>
          {isOpenContribution && targetAmount ? (
            <div className="mt-1 text-[12.5px] text-content-muted">
              Target {formatNaira(targetAmount)}
            </div>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-iris-soft px-2.5 py-1 text-[11px] font-medium text-iris-deep">
          <Icon icon={TickDouble02Icon} size={12} />
          {isOpenContribution ? "Choose amount" : "Tap your name"}
        </span>
      </div>
      {total > 0 && !isOpenContribution ? (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-content-faint">
            Members
          </span>
          <span className="text-[11.5px] text-content-faint">
            {remaining} of {total} left
          </span>
        </div>
      ) : null}
    </div>
  );
}

function MemberRow({
  member,
  selected,
  isOpenContribution,
  onSelect,
}: {
  member: CollectionPayMember;
  selected: boolean;
  isOpenContribution: boolean;
  onSelect: () => void;
}) {
  const claimed = !isOpenContribution && member.status === "claimed";

  return (
    <motion.button
      type="button"
      layout
      initial={false}
      animate={{ opacity: claimed ? 0.75 : 1 }}
      onClick={claimed ? undefined : onSelect}
      disabled={claimed}
      className={cn(
        "flex w-full items-center gap-3 rounded-[14px] border bg-card px-4 py-3 text-left shadow-card transition-colors",
        claimed ? "cursor-default border-hairline bg-emerald-soft/40" : "t-press cursor-pointer",
        selected && !claimed ? "border-iris ring-[3px] ring-iris-soft" : "border-hairline"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-iris-soft text-iris-deep">
        <Icon icon={UserIcon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[14px] font-semibold text-foreground",
            claimed && "text-content-muted line-through"
          )}
        >
          {member.displayName}
        </div>
        {claimed ? (
          <div className="mt-0.5 flex items-center gap-1 text-[11.5px] font-medium text-emerald-deep">
            <Icon icon={TickDouble02Icon} size={12} />
            Already paid
          </div>
        ) : isOpenContribution && member.paidAmount > 0 ? (
          <div className="mt-0.5 text-[11.5px] text-content-muted">
            Paid {formatNaira(member.paidAmount)} so far
          </div>
        ) : null}
      </div>
      {!isOpenContribution ? (
        <span
          className={cn(
            "font-display tabular text-[15px] font-bold tracking-[-0.01em]",
            claimed ? "text-content-faint" : "text-foreground"
          )}
        >
          {formatNaira(member.expectedAmount)}
        </span>
      ) : null}
      {claimed ? (
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-emerald text-white">
          <Icon icon={Tick02Icon} size={13} strokeWidth={2.75} />
        </span>
      ) : selected ? (
        <motion.span
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-iris text-white"
        >
          <Icon icon={Tick02Icon} size={14} strokeWidth={3} />
        </motion.span>
      ) : (
        <span className="size-[22px] shrink-0 rounded-full border-[1.5px] border-hairline" />
      )}
    </motion.button>
  );
}
