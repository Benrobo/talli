-- Bind each provider transaction (Nomba sessionId) to exactly one pending payment.
-- The unique index makes the "claim" write race-safe: a second intent attempting to
-- claim an already-used sessionId hits a constraint violation instead of double-crediting.
ALTER TABLE "pending_payments" ADD COLUMN "providerTransactionId" TEXT;

CREATE UNIQUE INDEX "pending_payments_providerTransactionId_key" ON "pending_payments"("providerTransactionId");
