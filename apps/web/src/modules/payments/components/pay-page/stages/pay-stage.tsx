import { Button } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { Icon } from "@benrobo/iconary/react";
import { Cancel01Icon } from "@benrobo/iconary/core/duotone-rounded";
import type { CollectionPayCheckoutResult } from "@/api/http/v1/collections/collections.types";
import {
  CheckoutSecureFooter,
  NombaPayTransferContent,
} from "@/modules/payments/components/nomba-checkout-ui";
import { useBackgroundConfirm } from "@/modules/payments/hooks/use-payment-verification";
import { useCopy } from "@/modules/payments/hooks/use-copy";
import { SECURE_NOTE } from "../constants";

export function PayStage({
  title,
  payerName,
  checkout,
  onPaid,
  onCancel,
  cancelling,
  error,
  reference,
  pendingPaymentId,
}: {
  title: string;
  payerName: string;
  checkout: CollectionPayCheckoutResult;
  onPaid: () => void;
  onCancel: () => void;
  cancelling: boolean;
  error: string | null;
  reference: string;
  pendingPaymentId: string | null;
}) {
  const { copied, copy } = useCopy();
  useBackgroundConfirm({ reference, pendingPaymentId, onConfirmed: onPaid });

  return (
    <MobileScreen
      footer={
        <div className="space-y-2.5">
          <Button block size="lg" onClick={onPaid}>
            I've sent the transfer
          </Button>
          {checkout.checkoutUrl ? (
            <Button asChild block variant="secondary" size="lg">
              <a href={checkout.checkoutUrl} target="_blank" rel="noreferrer">
                Pay with card or USSD instead
              </a>
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="flex w-full items-center justify-center gap-1.5 py-1.5 text-[13px] font-medium text-rose-deep transition-colors hover:text-rose disabled:opacity-50"
          >
            <Icon icon={Cancel01Icon} size={14} />
            {cancelling ? "Cancelling…" : "Cancel this payment"}
          </button>
          {error ? <p className="text-center text-[12.5px] text-rose-deep">{error}</p> : null}
          <CheckoutSecureFooter note={SECURE_NOTE} />
        </div>
      }
    >
      <NombaPayTransferContent
        transferLabel={`${payerName}, transfer`}
        title={title}
        checkout={checkout}
        copied={copied}
        onCopy={() => copy(checkout.flashAccountNumber)}
      />
    </MobileScreen>
  );
}
