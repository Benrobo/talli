---
name: secure-correctness-loop
description: Adversarial secure-engineering workflow for writing, fixing, reviewing, or refactoring code where correctness, authorization, money, identity, state transitions, concurrency, idempotency, external events, or data integrity matter. Use before changing high-risk code and when investigating regressions, security flaws, race conditions, replay or deduplication failures, stale-event bugs, edge cases, and implementations that only work on the happy path.
---

# Secure Correctness Loop

Raise confidence through evidence, invariants, adversarial analysis, and verification. Never promise bug-free or 100% accurate code. Treat an unverified security or correctness claim as unresolved.

## Operating rules

- Respect the requested scope. Diagnose without editing when asked to investigate or review. Do not broaden a fix into unrelated cleanup.
- Read repository instructions, relevant architecture, conventions, known lessons, schemas, migrations, callers, and tests before writing.
- Preserve user changes. Inspect the working tree and make surgical edits.
- Distinguish facts observed in code, data, logs, or documentation from assumptions and hypotheses.
- Prefer simple mechanisms with enforceable properties over clever application logic.
- Enforce critical guarantees at the strongest available layer: database constraints and transactions before process-local checks; server-side validation before client behavior.
- Fail closed when identity, ownership, authorization, amount, state, or provider evidence is ambiguous.
- Never use amount, display text, timestamps, array position, or client state as a unique transaction identity.
- Never claim success because code compiles. Verify the behavior that matters.

## Run the loop

Repeat this loop until every applicable completion gate passes or a concrete blocker is reported.

### 1. Establish scope and risk

State the requested outcome and what must not change. Classify the change as critical when it can affect money, identity, authentication, authorization, secrets, irreversible actions, ledger state, external side effects, or cross-tenant data.

Identify:

- Actors and trust boundaries.
- Authoritative records and derived views.
- Stable identifiers and ownership relationships.
- Inputs controlled by clients, providers, queues, clocks, caches, or other services.
- Side effects and points where a retry can occur.
- Existing dirty-worktree changes that must be preserved.

### 2. Reconstruct behavior

Trace the real path from entry point to durable state and external side effects. Read routes, middleware, validators, controllers, services, queries, schema constraints, jobs, webhooks, polling, client callers, and provider contracts that participate.

Answer with evidence:

- What event starts the operation?
- Which identifier correlates an attempt to its result?
- Who is authorized to read, mutate, retry, cancel, or complete it?
- What transitions are legal?
- Which write is the commit point?
- What happens if execution stops immediately before or after each side effect?
- How are duplicates, late events, retries, and concurrent workers handled?

Do not infer a provider guarantee from a field name. Check the provider contract or existing captured payloads.

### 3. Define invariants

Write the properties that must remain true before proposing a fix. Make them specific and falsifiable.

Typical invariants include:

- One provider transaction can settle at most one internal intent.
- One intent can produce at most one ledger effect.
- A user can mutate only resources they own or are explicitly authorized to manage.
- A completed or cancelled state cannot silently return to a mutable state.
- Money is represented in one documented unit and currency at every boundary.
- A success response is emitted only after the authoritative write commits.
- Retrying the same operation is safe and produces the same durable result.
- Notification failure cannot roll back a committed financial effect.
- Cancellation or expiry cannot make received money disappear; late funds enter a defined recovery path.

### 4. Attack the assumptions

Build an abuse and failure matrix before coding. Cover every applicable case:

- The same amount occurs twice.
- A previous successful event remains visible.
- The same request, webhook, callback, or queue message is replayed.
- Two workers process the same record concurrently.
- Events arrive late or out of order.
- A timeout occurs after the provider succeeds but before the local response.
- A crash occurs between related writes.
- A client supplies another user's identifier.
- Client state disagrees with server state.
- A record expires, is cancelled, or is deleted while work is in flight.
- Empty, malformed, zero, negative, fractional, overflow, wrong-currency, and boundary values arrive.
- Provider fields are missing, renamed, duplicated, or internally inconsistent.
- Clocks, time zones, pagination, cache freshness, or eventual consistency distort the view.
- A dependency succeeds twice, fails partially, or returns an indeterminate result.

For each case, identify the expected safe outcome and the layer that enforces it.

### 5. Find the root cause

Reproduce or explain the failure through the traced data path. Separate the trigger, root cause, and missing invariant. Search for sibling paths with the same pattern.

Reject symptom-only fixes such as longer delays, narrower time windows, UI-only guards, in-memory locks, or filtering the first matching amount when the system needs stable identity and atomic ownership.

### 6. Design the smallest complete fix

Choose a design that makes invalid states difficult or impossible:

- Correlate with a provider-issued stable transaction, order, event, or idempotency identifier.
- Add a database uniqueness constraint when uniqueness is a business invariant.
- Claim work atomically with a conditional update, upsert, transaction, or compare-and-set.
- Keep check and write in the same transaction when concurrency can invalidate a check.
- Validate identity, ownership, purpose, amount, currency, account, recipient, and state server-side.
- Model legal state transitions explicitly and reject illegal transitions.
- Make external side effects idempotent or persist an outbox/recovery state around them.
- Define behavior for old rows, in-flight operations, rollout, rollback, and provider uncertainty.

If no stable external identity exists, do not auto-settle an ambiguous payment. Keep it pending or route it to reconciliation/manual review.

### 7. Implement surgically

Change only the layers required to enforce the invariant. Reuse established repository patterns. Keep authorization and validation at the entry point and enforcement at the durable boundary.

When changing persistence:

- Supply a migration and compatibility plan when the task authorizes schema changes.
- Consider existing duplicates before adding uniqueness.
- Keep old and new workers safe during rolling deployment.
- Avoid destructive backfills without explicit authorization and recovery evidence.

### 8. Verify adversarially

Verify at the narrowest useful layer, then at integration boundaries. Use existing tests and commands first; add a regression test only when task scope permits.

Require evidence for applicable cases:

- The original failure is reproduced before the fix or represented by a failing regression case.
- The original failure no longer occurs.
- A second legitimate operation with the same amount still works.
- Replaying the same external event does not duplicate the effect.
- Concurrent attempts produce one winner and a deterministic safe result for the rest.
- Cross-user or cross-tenant identifiers are rejected.
- Late, expired, cancelled, and out-of-order events follow the defined recovery path.
- Partial failures can be retried without loss or duplication.
- Targeted tests, type checking, linting, and builds pass as appropriate.
- Database constraints or transaction behavior, not timing luck, prove concurrency claims.

Do not say “should pass” or “appears safe” when the command or scenario can be run.

### 9. Review the diff as an attacker

Read the final diff without relying on implementation intent. Ask:

- Can any untrusted field select another user's record?
- Can the operation be replayed or raced?
- Can two identifiers refer to different attempts?
- Can a stale success satisfy a new request?
- Can failure after a side effect cause duplication on retry?
- Can logs expose secrets, tokens, account data, or unnecessary personal information?
- Did the fix introduce a bypass through a sibling route, job, webhook, or client?
- Did unrelated behavior change?

Use an independent reviewer or subagent for a fresh pass only when the environment permits it and the user has authorized delegation.

### 10. Report honestly

Report:

1. Evidence and root cause.
2. Invariants enforced.
3. Files changed.
4. Verification actually run and its results.
5. Residual risks, unknowns, and blocked checks.

Never hide uncertainty behind confident language. Stop and request the missing authority or information when safe completion depends on production data, provider behavior, secrets, destructive migration, or a material product decision.

## Completion gates

Do not declare a critical change complete until all applicable gates pass:

- Scope gate: the implementation matches the request and preserves unrelated work.
- Identity gate: every operation and external event uses stable, unambiguous correlation.
- Authorization gate: ownership and permissions are enforced server-side.
- State gate: legal transitions, terminal states, retries, and recovery are defined.
- Atomicity gate: concurrency cannot bypass deduplication or split related writes.
- Validation gate: all untrusted values are validated in the authoritative layer.
- Replay gate: duplicate and stale events are harmless.
- Failure gate: partial success has a retry or reconciliation path.
- Evidence gate: targeted verification has been executed and reviewed.
- Diff gate: no unrelated changes, debug artifacts, secrets, or unsafe logging remain.

If a gate does not apply, state why. If it cannot pass, report the blocker and leave the system in the safest available state.
