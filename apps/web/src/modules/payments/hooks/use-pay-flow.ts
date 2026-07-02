import { useMemo, useState } from "react";
import {
  useCancelCollectionPay,
  useCheckoutCollectionPay,
  useCollectionPayView,
} from "@/api/http/v1/collections/collections.hooks";
import type {
  CollectionPayCheckoutResult,
  CollectionPayMember,
} from "@/api/http/v1/collections/collections.types";
import { payErrorMessage } from "../components/pay-page/errors";
import type { CheckoutPayload, PayStage, PendingCheckout } from "../components/pay-page/types";
import { useNavigate } from "@tanstack/react-router";

export function usePayFlow(reference: string) {
  const query = useCollectionPayView(reference);
  const checkoutPay = useCheckoutCollectionPay(reference);
  const cancelPay = useCancelCollectionPay(reference);
  const navigate = useNavigate();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [stage, setStage] = useState<PayStage>("pick");
  const [checkout, setCheckout] = useState<CollectionPayCheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<CheckoutPayload | null>(null);

  const view = query.data?.data ?? null;
  const members = view?.members ?? [];
  const isOpenContribution = view?.collectionType === "open_contribution";
  const remaining = members.filter((member) => member.status !== "claimed").length;

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  );

  const amount = selectedMember?.expectedAmount ?? view?.amountPerMember ?? 0;

  // The checkout response carries the exact pending-payment id, which is the
  // reliable source right after creating a checkout. The collection view lags (it
  // isn't refetched on checkout) and, for a brand-new open-pot payer, has no
  // matching member row yet — relying on it made verify fail instantly. So prefer
  // the checkout id, then fall back to the view for resumed/existing pendings.
  const pendingPaymentId =
    checkout?.pendingPaymentId ??
    selectedMember?.pendingPayment?.pendingPaymentId ??
    members.find((member) => member.id === pendingCheckout?.memberId)?.pendingPayment
      ?.pendingPaymentId ??
    null;

  function submit(payload: CheckoutPayload) {
    setError(null);
    checkoutPay.mutate(payload, {
      onSuccess: (result) => {
        setPayerName(result.data.payerName);
        setCheckout(result.data);
        setStage("pay");
      },
      onError: (err) => setError(payErrorMessage(err, "Something went wrong. Try again.")),
    });
  }

  function beginAmountStep(next: PendingCheckout) {
    setPendingCheckout(next);
    setAmountInput("");
    setError(null);
    setStage("pay-amount");
  }

  function resume(member: CollectionPayMember): boolean {
    const pending = member.pendingPayment;
    if (!pending || !pending.flashAccountNumber) return false;
    setPayerName(member.displayName);
    setSelectedMemberId(member.id);
    setPendingCheckout({ memberId: member.id });
    setCheckout({
      pendingPaymentId: pending.pendingPaymentId,
      memberId: member.id,
      amount: pending.amount,
      payerName: member.displayName,
      flashAccountNumber: pending.flashAccountNumber,
      flashBankName: pending.flashBankName ?? "",
      flashAccountName: pending.flashAccountName ?? undefined,
      checkoutUrl: "",
    });
    setError(null);
    setStage("pay");
    return true;
  }

  function showFailed(member: CollectionPayMember, retry: CheckoutPayload): boolean {
    if (member.pendingPayment || member.lastFailedAmount === null) return false;
    setPayerName(member.displayName);
    setSelectedMemberId(member.id);
    setPendingCheckout({ memberId: member.id });
    setRetryPayload(retry);
    setCheckout(null);
    setError(null);
    setStage("failed");
    return true;
  }

  function continueFromPick() {
    if (!selectedMemberId) return;
    if (selectedMember && resume(selectedMember)) return;
    if (isOpenContribution) {
      beginAmountStep({ memberId: selectedMemberId });
      return;
    }
    if (selectedMember && showFailed(selectedMember, { memberId: selectedMemberId })) return;
    submit({ memberId: selectedMemberId });
  }

  function continueFromName(name: string) {
    setPayerName(name);
    const existing = members.find(
      (member) => member.displayName.toLowerCase() === name.trim().toLowerCase()
    );
    if (existing && resume(existing)) return;
    if (isOpenContribution) {
      beginAmountStep({ payerName: name });
      return;
    }
    if (existing && showFailed(existing, { payerName: name })) return;
    submit({ payerName: name });
  }

  function continueFromAmount() {
    if (!pendingCheckout) return;
    const numericAmount = Number(amountInput);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    submit({ ...pendingCheckout, amount: numericAmount });
  }

  function cancelPending() {
    const memberId = selectedMemberId ?? pendingCheckout?.memberId;
    if (!memberId) return;
    setError(null);
    cancelPay.mutate(memberId, {
      onSuccess: () => {
        setCheckout(null);
        setAmountInput("");
        if (isOpenContribution) {
          setPendingCheckout({ memberId });
          setStage("pay-amount");
        } else {
          setPendingCheckout(null);
          setStage("pick");
        }
      },
      onError: (err) => setError(payErrorMessage(err, "Couldn't cancel this payment. Try again.")),
    });
  }

  function retryFailed() {
    setCheckout(null);
    setAmountInput("");
    setError(null);
    if (retryPayload) {
      const payload = retryPayload;
      setRetryPayload(null);
      submit(payload);
      return;
    }
    if (isOpenContribution && pendingCheckout?.memberId) {
      setStage("pay-amount");
    } else {
      setPendingCheckout(null);
      setSelectedMemberId(null);
      setStage("pick");
    }
    query.refetch();
  }

  function reset() {
    setCheckout(null);
    setSelectedMemberId(null);
    setPendingCheckout(null);
    setAmountInput("");
    setStage("pick");
    query.refetch();
    navigate({ to: "/app/collections" });
  }

  function selectMember(member: CollectionPayMember) {
    if (member.status === "claimed") return;
    setSelectedMemberId(member.id);
  }

  function startNewPayer() {
    setSelectedMemberId(null);
    setStage("pay-name");
  }

  return {
    query,
    view,
    members,
    isOpenContribution,
    remaining,
    selectedMemberId,
    selectedMember,
    amount,
    payerName,
    nameInput,
    setNameInput,
    amountInput,
    setAmountInput,
    pendingCheckout,
    stage,
    setStage,
    checkout,
    error,
    pendingPaymentId,
    submitting: checkoutPay.isPending,
    cancelling: cancelPay.isPending,
    continueFromPick,
    continueFromName,
    continueFromAmount,
    cancelPending,
    retryFailed,
    reset,
    selectMember,
    startNewPayer,
  };
}

export type PayFlow = ReturnType<typeof usePayFlow>;
