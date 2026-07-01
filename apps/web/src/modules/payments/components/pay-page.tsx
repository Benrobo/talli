import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@app/ui";
import { Button, Card } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import {
  BankIcon,
  CreditCardIcon,
  Icon,
  LockIcon,
  SmartPhone01Icon,
  Tick02Icon,
} from "@app/icons";
import type { IconData } from "@app/icons";
import { formatNaira } from "@/lib/format";
import { paymentRequest } from "@/data/mock/payments";
import type { PayMethod } from "@/modules/payments/types";

interface MethodOption {
  id: PayMethod;
  label: string;
  icon: IconData;
}

const METHODS: MethodOption[] = [
  { id: "bank", label: "Bank transfer", icon: BankIcon },
  { id: "card", label: "Card", icon: CreditCardIcon },
  { id: "ussd", label: "USSD", icon: SmartPhone01Icon },
];

/** Public Pay page — a member settles a collection in two taps (screen 3a). */
export function PayPage() {
  const { reference, purpose, amountMinor, payingAs, payTo, due } =
    paymentRequest;
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
            <Icon data={LockIcon} size={12} />
            Secured by Nomba · money goes straight to the group
          </div>
        </div>
      }
    >
      <div className="mb-6 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-[11px] border border-hairline bg-card px-3 py-2 font-mono text-[11.5px] text-content-muted">
          <Icon data={LockIcon} size={13} />
          pay.talli.money
        </span>
      </div>

      <div className="mb-6 text-center">
        <div className="mb-1.5 text-[13px] text-content-muted">
          You're paying for
        </div>
        <div className="mb-4 font-serif text-[25px] font-normal leading-tight">
          {purpose}
        </div>
        <div className="tabular text-[44px] font-bold tracking-tight">
          {formatNaira(amountMinor)}
        </div>
      </div>

      <Card className="mb-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between text-[13.5px]">
            <span className="text-content-muted">Paying as</span>
            <span className="font-medium">{payingAs}</span>
          </div>
          <div className="flex justify-between text-[13.5px]">
            <span className="text-content-muted">To</span>
            <span className="font-medium">{payTo}</span>
          </div>
          <div className="flex justify-between text-[13.5px]">
            <span className="text-content-muted">Due</span>
            <span className="font-medium">{due}</span>
          </div>
        </div>
      </Card>

      <div className="mb-3 font-mono text-[10.5px] tracking-[0.1em] text-content-faint">
        PAY WITH
      </div>
      <div className="flex flex-col gap-2.5">
        {METHODS.map((option) => {
          const selected = option.id === method;
          return (
            <Card
              key={option.id}
              onClick={() => setMethod(option.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 p-3.5",
                selected && "border-iris ring-[3px] ring-iris-soft"
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-iris-soft text-iris-deep">
                <Icon data={option.icon} size={18} />
              </span>
              <span className="flex-1 text-[14px] font-medium">
                {option.label}
              </span>
              {selected ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-iris text-white">
                  <Icon data={Tick02Icon} size={12} />
                </span>
              ) : (
                <span className="size-[19px] rounded-full border-[1.5px] border-[#cfccdd]" />
              )}
            </Card>
          );
        })}
      </div>
    </MobileScreen>
  );
}
