import type { ReactNode } from "react";
import { cn } from "@app/ui";
import { StatusPill, UserAvatar } from "@/components/ui";
import { Hint } from "@/components/hint";
import { TelegramMark, WhatsappMark } from "@/components/ui/brand-marks";
import { Icon } from "@benrobo/iconary/react";
import { GlobeIcon } from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira } from "@/lib/format";
import type { Member, MemberStatus } from "@/modules/collections/types";

const STATUS: Record<MemberStatus, { status: "success" | "pending" | "neutral"; label: string }> = {
  paid: { status: "success", label: "Paid" },
  paying: { status: "pending", label: "Paying" },
  unpaid: { status: "neutral", label: "Unpaid" },
};

function sourceBadge(member: Member): { mark: ReactNode; title: string } {
  if (member.platform === "telegram") {
    return {
      mark: <TelegramMark size={15} />,
      title: member.username ? `@${member.username} on Telegram` : "Paid via Telegram",
    };
  }
  if (member.platform === "whatsapp") {
    return {
      mark: <WhatsappMark size={15} />,
      title: member.username ? `${member.username} on WhatsApp` : "Paid via WhatsApp",
    };
  }
  return {
    mark: <Icon icon={GlobeIcon} size={14} color="var(--color-content-faint)" />,
    title: "Paid from the web",
  };
}

interface MemberRowProps {
  member: Member;
  isOpenContribution?: boolean;
  className?: string;
}

export function MemberRow({ member, isOpenContribution, className }: MemberRowProps) {
  const badge = STATUS[member.status];
  const source = sourceBadge(member);

  return (
    <div className={cn("flex items-center gap-3 px-[19px] py-[13px]", className)}>
      <UserAvatar seed={member.username ?? member?.name} variant="initials" size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-medium">{member.name}</span>
          <Hint label={source.title}>
            <span className="flex shrink-0 cursor-default items-center">{source.mark}</span>
          </Hint>
        </div>
        {isOpenContribution ? (
          <div className="text-[11.5px] text-content-faint">
            {member.paidAmount > 0
              ? member.contributionCount > 1
                ? `contributed · ${member.contributionCount} times`
                : "contributed"
              : member.status === "paying"
                ? "sending…"
                : "no contribution yet"}
          </div>
        ) : member.note ? (
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
      {isOpenContribution ? (
        member.paidAmount > 0 ? (
          <span className="font-display tabular text-[14px] font-bold tracking-[-0.01em] text-emerald-deep">
            {formatNaira(member.paidAmount)}
          </span>
        ) : member.status === "paying" ? (
          <StatusPill status="pending" dot>
            Sending
          </StatusPill>
        ) : (
          <span className="text-[12px] text-content-faint">—</span>
        )
      ) : (
        <StatusPill status={badge.status} dot={member.status === "paying"}>
          {badge.label}
        </StatusPill>
      )}
    </div>
  );
}
