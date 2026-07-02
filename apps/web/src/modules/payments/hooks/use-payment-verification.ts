import { useEffect, useRef, useState } from "react";
import { useVerifyCollectionPay } from "@/api/http/v1/collections/collections.hooks";
import type { CollectionPayVerifyStatus } from "@/api/http/v1/collections/collections.types";
import {
  BACKGROUND_POLL_MS,
  VERIFY_INTERVAL_MS,
  VERIFY_MAX_ATTEMPTS,
} from "../components/pay-page/constants";

const TERMINAL_FAILURES: CollectionPayVerifyStatus[] = ["failed", "expired", "cancelled"];

export function usePaymentVerification({
  reference,
  pendingPaymentId,
  onConfirmed,
  onFailed,
}: {
  reference: string;
  pendingPaymentId: string | null;
  onConfirmed: () => void;
  onFailed: () => void;
}) {
  const verify = useVerifyCollectionPay(reference);
  const attemptsRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!pendingPaymentId) {
      onFailed();
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const onIdle = () => {
      if (!active) return;
      attemptsRef.current += 1;
      setElapsed(attemptsRef.current);
      if (attemptsRef.current >= VERIFY_MAX_ATTEMPTS) {
        onFailed();
        return;
      }
      timer = setTimeout(tick, VERIFY_INTERVAL_MS);
    };

    const tick = () => {
      if (!active) return;
      verify.mutate(pendingPaymentId, {
        onSuccess: (res) => {
          if (!active) return;
          const status = res.data.status;
          if (status === "completed") {
            onConfirmed();
            return;
          }
          if (TERMINAL_FAILURES.includes(status)) {
            onFailed();
            return;
          }
          onIdle();
        },
        onError: onIdle,
      });
    };

    timer = setTimeout(tick, VERIFY_INTERVAL_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPaymentId, reference]);

  const secondsLeft = Math.max(0, (VERIFY_MAX_ATTEMPTS - elapsed) * (VERIFY_INTERVAL_MS / 1000));

  return { secondsLeft };
}

export function useBackgroundConfirm({
  reference,
  pendingPaymentId,
  onConfirmed,
}: {
  reference: string;
  pendingPaymentId: string | null;
  onConfirmed: () => void;
}) {
  const verify = useVerifyCollectionPay(reference);

  useEffect(() => {
    if (!pendingPaymentId) return;
    let active = true;
    const id = setInterval(() => {
      verify.mutate(pendingPaymentId, {
        onSuccess: (res) => {
          if (active && res.data.status === "completed") onConfirmed();
        },
      });
    }, BACKGROUND_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPaymentId, reference]);
}
