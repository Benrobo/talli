import { Button } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { AlertCircleIcon } from "@benrobo/iconary/core/duotone-rounded";
import { CheckoutSecureFooter } from "@/modules/payments/components/nomba-checkout-ui";
import { SECURE_NOTE } from "../constants";
import { StatusCard } from "./status-card";

export function FailedStage({ onRetry, retrying = false }: { onRetry: () => void; retrying?: boolean }) {
  return (
    <MobileScreen
      footer={
        <div>
          <Button block size="lg" onClick={onRetry} disabled={retrying}>
            {retrying ? "Setting up…" : "Try again"}
          </Button>
          <CheckoutSecureFooter note={SECURE_NOTE} />
        </div>
      }
    >
      <StatusCard icon={AlertCircleIcon} title="We couldn't confirm it yet">
        We didn't see your transfer land in time. If you didn't send it, nothing was taken. If you
        did, it'll be counted automatically once it arrives — and we'll email you.
      </StatusCard>
    </MobileScreen>
  );
}
