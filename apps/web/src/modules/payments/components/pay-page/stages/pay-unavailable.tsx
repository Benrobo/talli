import { MobileScreen } from "@/components/layout";
import { AlertCircleIcon } from "@benrobo/iconary/core/duotone-rounded";
import { StatusCard } from "./status-card";

export function PayUnavailable() {
  return (
    <MobileScreen>
      <StatusCard icon={AlertCircleIcon} title="This collection isn't available">
        The link may have expired, or the collection is no longer accepting payments.
      </StatusCard>
    </MobileScreen>
  );
}
