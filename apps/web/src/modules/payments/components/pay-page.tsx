import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@app/ui";
import { Button, Card, StatusPill, FadeIn } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import {
  BankIcon,
  Calendar03Icon,
  CreditCardIcon,
  LockIcon,
  SmartPhone01Icon,
  Tick02Icon,
  User02Icon,
  UserMultipleIcon,
} from "@benrobo/iconary/core/duotone-rounded";

import { formatNaira } from "@/lib/format";
import { paymentRequest } from "@/data/mock/payments";
import type { PayMethod } from "@/modules/payments/types";

interface MethodOption {
  id: PayMethod;
  label: string;
  hint: string;
  icon: IconData;
}

const METHODS: MethodOption[] = [
  { id: "bank", label: "Bank transfer", hint: "Send from any bank app", icon: BankIcon },
  { id: "card", label: "Card", hint: "Debit or credit card", icon: CreditCardIcon },
  { id: "ussd", label: "USSD", hint: "Dial a short code", icon: SmartPhone01Icon },
];

export function PayPage() {
  const { reference, purpose, amountMinor, payingAs, payTo, due } = paymentRequest;
  const [method, setMethod] = useState<PayMethod>("bank");

  return (
    <MobileScreen
      footer={
        <div>
          <Link to="/pay/$reference/receipt" params={{ reference }}>
            <Button block size="lg">
              Pay {formatNaira(amountMinor)}
            </Button>
          </Link>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-content-faint">
            <Icon icon={LockIcon} size={12} />
            Secured by Nomba · money goes straight to the group
          </div>
        </div>
      }
    >
      <FadeIn className="mb-6 flex items-center justify-between" y={8}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-3 py-1.5 text-[11.5px] font-medium text-content-muted shadow-card">
          <Icon icon={LockIcon} size={12} className="text-content-faint" />
          pay.talli.money
        </span>
        <StatusPill status="info" dot>
          Awaiting payment
        </StatusPill>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card className="mb-4 items-center text-center">
          <div className="mb-1.5 text-[12.5px] font-medium text-content-muted">You're paying for</div>
          <div className="mb-4 text-[17px] font-semibold tracking-[-0.01em] text-foreground">
            {purpose}
          </div>
          <div className="tabular text-[38px] font-bold leading-none tracking-[-0.02em] text-foreground">
            {formatNaira(amountMinor)}
          </div>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card padded={false} className="mb-5 overflow-hidden">
          <DetailRow icon={User02Icon} label="Paying as" value={payingAs} />
          <DetailRow icon={UserMultipleIcon} label="To" value={payTo} />
          <DetailRow icon={Calendar03Icon} label="Due" value={due} last />
        </Card>
      </FadeIn>

      <FadeIn delay={0.14}>
        <div className="mb-2.5 text-[13px] font-semibold text-foreground">Pay with</div>
        <div className="flex flex-col gap-2.5">
          {METHODS.map((option) => {
            const selected = option.id === method;
            return (
              <Card
                key={option.id}
                onClick={() => setMethod(option.id)}
                className={cn(
                  "flex-row items-center gap-3 p-3.5 transition-colors cursor-pointer",
                  selected ? "border-iris ring-[3px] ring-iris-soft" : "hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                    selected ? "bg-iris-soft text-iris-deep" : "bg-muted text-content-muted"
                  )}
                >
                  <Icon icon={option.icon} size={18} />
                </span>
                <span className="flex-1">
                  <span className="block text-[14px] font-medium text-foreground">{option.label}</span>
                  <span className="block text-[11.5px] text-content-faint">{option.hint}</span>
                </span>
                {selected ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-iris text-white">
                    <Icon icon={Tick02Icon} size={12} />
                  </span>
                ) : (
                  <span className="size-[19px] rounded-full border-[1.5px] border-hairline" />
                )}
              </Card>
            );
          })}
        </div>
      </FadeIn>
    </MobileScreen>
  );
}

interface DetailRowProps {
  icon: IconData;
  label: string;
  value: string;
  last?: boolean;
}

function DetailRow({ icon, label, value, last }: DetailRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !last && "border-b border-hairline-soft"
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-muted text-content-muted">
        <Icon icon={icon} size={15} />
      </span>
      <span className="flex-1 text-[13px] text-content-muted">{label}</span>
      <span className="text-[13.5px] font-medium text-foreground">{value}</span>
    </div>
  );
}
