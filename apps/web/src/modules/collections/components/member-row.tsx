import { cn } from "@app/ui";
import { Avatar, Badge } from "@/components/ui";
import type { Member, MemberStatus } from "@/modules/collections/types";

const BADGE: Record<MemberStatus, { tone: "iris" | "amber" | "neutral"; label: string }> = {
  paid: { tone: "iris", label: "PAID" },
  paying: { tone: "amber", label: "PAYING" },
  unpaid: { tone: "neutral", label: "UNPAID" },
};

interface MemberRowProps {
  member: Member;
  className?: string;
}

/** A single member line: avatar, name + note, and a status badge. */
export function MemberRow({ member, className }: MemberRowProps) {
  const badge = BADGE[member.status];
  return (
    <div className={cn("flex items-center gap-3 px-[19px] py-[13px]", className)}>
      <Avatar name={member.name} tone={member.status === "paid" ? "iris" : "muted"} />
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
      <Badge tone={badge.tone}>{badge.label}</Badge>
    </div>
  );
}
