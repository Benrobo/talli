import { MobileScreen } from "@/components/layout";
import { formatNaira } from "@/lib/format";
import { NombaPayDoneContent } from "@/modules/payments/components/nomba-checkout-ui";

export function DoneStage({
  title,
  payerName,
  amount,
  onBack,
}: {
  title: string;
  payerName: string;
  amount: number;
  onBack: () => void;
}) {
  return (
    <MobileScreen>
      <NombaPayDoneContent
        headline={`You're all set, ${payerName}!`}
        description={`${formatNaira(amount)} paid for ${title}.`}
        backLabel="Back to collection"
        onBack={onBack}
      />
    </MobileScreen>
  );
}
