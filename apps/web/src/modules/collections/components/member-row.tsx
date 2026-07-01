import { cn } from "@app/ui";
import { Avatar, StatusPill } from "@/components/ui";
import type { Member, MemberStatus } from "@/modules/collections/types";

const STATUS: Record<MemberStatus, { status: "success" | "pending" | "neutral"; label: string }> = {
  paid: { status: "success", label: "Paid" },
  paying: { status: "pending", label: "Paying" },
  unpaid: { status: "neutral", label: "Unpaid" },
};

interface MemberRowProps {
  member: Member;
  className?: string;
}

export function MemberRow({ member, className }: MemberRowProps) {
  const badge = STATUS[member.status];
  return (
    <div className={cn("flex items-center gap-3 px-[19px] py-[13px]", className)}>
      <Avatar name={member.name} tone="muted" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium">{member.name}</div>
        {member.note ? (
          <div
            className={cn(
              "text-[11.5px]",
              member.status === "paying" ? "text-amber-deep" : "text-content-faint"
            )}
          >
            {member.note}
          </div>
        ) : null}
      </div>
      <StatusPill status={badge.status} dot={member.status === "paying"}>
        {badge.label}
      </StatusPill>
    </div>
  );
}
