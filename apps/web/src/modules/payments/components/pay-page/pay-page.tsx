import { useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { formatNaira } from "@/lib/format";
import { usePayFlow } from "@/modules/payments/hooks/use-pay-flow";
import { CheckoutSecureFooter } from "@/modules/payments/components/nomba-checkout-ui";
import { SECURE_NOTE } from "./constants";
import {
  AmountStep,
  DoneStage,
  FailedStage,
  MemberPicker,
  NameStep,
  PayLoading,
  PayStage,
  PayUnavailable,
  VerifyStage,
} from "./stages";

export function PayPage() {
  const { reference } = useParams({ from: "/pay/$reference/" });
  const flow = usePayFlow(reference);

  if (flow.query.isLoading) return <PayLoading />;
  if (flow.query.isError || !flow.view) return <PayUnavailable />;

  const { view } = flow;

  if (flow.stage === "pay" && flow.checkout) {
    return (
      <PayStage
        title={view.title}
        payerName={flow.payerName}
        checkout={flow.checkout}
        onPaid={() => flow.setStage("verifying")}
        onCancel={flow.cancelPending}
        cancelling={flow.cancelling}
        error={flow.error}
        reference={reference}
        pendingPaymentId={flow.pendingPaymentId}
      />
    );
  }

  if (flow.stage === "verifying" && flow.checkout) {
    return (
      <VerifyStage
        reference={reference}
        pendingPaymentId={flow.pendingPaymentId}
        amount={flow.checkout.amount}
        onConfirmed={() => flow.setStage("done")}
        onFailed={() => flow.setStage("failed")}
      />
    );
  }

  if (flow.stage === "failed") {
    return <FailedStage retrying={flow.submitting} onRetry={flow.retryFailed} />;
  }

  if (flow.stage === "done" && flow.checkout) {
    return (
      <DoneStage
        title={view.title}
        payerName={flow.payerName}
        amount={flow.checkout.amount}
        onBack={flow.reset}
      />
    );
  }

  if (flow.stage === "pay-name") {
    return (
      <MobileScreen>
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-card p-6 shadow-card">
          <NameStep
            knownNames={flow.members
              .filter((member) => member.status !== "claimed")
              .map((member) => member.displayName)}
            value={flow.nameInput}
            onChange={flow.setNameInput}
            onBack={() => flow.setStage("pick")}
            onConfirm={flow.continueFromName}
            submitting={flow.submitting}
            error={flow.error}
            isOpenContribution={flow.isOpenContribution}
            amount={flow.amount}
          />
        </div>
      </MobileScreen>
    );
  }

  if (flow.stage === "pay-amount" && flow.pendingCheckout) {
    const displayName =
      flow.pendingCheckout.payerName ??
      flow.members.find((member) => member.id === flow.pendingCheckout?.memberId)?.displayName ??
      flow.payerName;

    return (
      <MobileScreen
        footer={
          <div>
            <Button
              block
              size="lg"
              disabled={flow.submitting || !flow.amountInput}
              onClick={flow.continueFromAmount}
            >
              {flow.amountInput ? `Pay ${formatNaira(Number(flow.amountInput))}` : "Enter an amount"}
            </Button>
            <CheckoutSecureFooter note={SECURE_NOTE} />
          </div>
        }
      >
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-card p-6 shadow-card">
          <AmountStep
            payerName={displayName}
            title={view.title}
            targetAmount={view.targetAmount}
            value={flow.amountInput}
            onChange={flow.setAmountInput}
            onBack={() => flow.setStage(flow.pendingCheckout?.memberId ? "pick" : "pay-name")}
            submitting={flow.submitting}
            error={flow.error}
          />
        </div>
      </MobileScreen>
    );
  }

  return (
    <MemberPicker
      title={view.title}
      payTo={view.payTo}
      targetAmount={view.targetAmount}
      members={flow.members}
      remaining={flow.remaining}
      isOpenContribution={flow.isOpenContribution}
      selectedMemberId={flow.selectedMemberId}
      amount={flow.amount}
      submitting={flow.submitting}
      onSelect={flow.selectMember}
      onContinue={() => {
        if (flow.isOpenContribution && flow.members.length === 0) {
          flow.setStage("pay-name");
          return;
        }
        flow.continueFromPick();
      }}
      onNewPayer={flow.startNewPayer}
    />
  );
}
