import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@app/ui";
import { TalliLogo } from "@/components/brand/talli-logo";
import { Button } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  MinusSignIcon,
  PlusSignIcon,
  SecurityLockIcon,
  Tick02Icon,
} from "@benrobo/iconary/core/duotone-rounded";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas text-content antialiased">
      <MobileHeader />
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 lg:grid-cols-[minmax(360px,40%)_1fr]">
        <LeftRail />
        <RightStream />
      </div>
      <SiteFooter />
    </div>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/85 px-5 py-3 backdrop-blur-md lg:hidden">
      <Link to="/" className="flex items-center gap-2.5">
        <TalliLogo className="h-7" />
        <span className="font-display text-[17px] font-bold tracking-tight">Talli</span>
      </Link>
      <Button asChild size="sm">
        <Link to="/auth">Start free</Link>
      </Button>
    </header>
  );
}

function LeftRail() {
  return (
    <aside className="relative border-b border-line lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col justify-between px-6 py-8 sm:px-10 lg:py-10">
        <div className="hidden items-center justify-between lg:flex">
          <Link to="/" className="flex items-center gap-2.5">
            <TalliLogo className="h-8" />
            <span className="font-display text-[19px] font-bold tracking-tight">Talli</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>

        <div className="max-w-[440px] py-10 lg:py-0">
          <div className="mb-6 inline-flex items-center gap-2 text-[12.5px] font-medium text-content-muted">
            <span className="inline-flex h-6 items-center rounded-full bg-iris-soft px-2.5 font-semibold text-iris-deep">
              The AI treasurer for group money
            </span>
          </div>

          <h1 className="font-display text-[clamp(40px,6.4vw,72px)] font-bold leading-[0.94] tracking-[-0.045em]">
            Everyone paid?
            <br />
            Talli keeps{" "}
            <span className="relative inline-block whitespace-nowrap text-iris">
              count
              <svg
                aria-hidden
                viewBox="0 0 200 28"
                preserveAspectRatio="none"
                className="absolute left-[-3%] top-1/2 h-[0.5em] w-[106%] -translate-y-[38%] text-iris/40"
                fill="none"
              >
                <path d="M3 22 L197 7" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
              </svg>
            </span>
            .
          </h1>

          <p className="mt-7 max-w-[380px] text-[15.5px] leading-relaxed text-content-muted">
            Collect money, track who paid, run savings jars and answer payment questions — right in
            your WhatsApp or Telegram group. No spreadsheets, no screenshots, no manual reminders.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Button asChild size="lg" trailingIcon={<Icon icon={ArrowRight01Icon} size={17} />}>
              <Link to="/auth">Start free</Link>
            </Button>
            <span className="text-[12.5px] text-content-faint">Free to start. No card.</span>
          </div>
        </div>

        <div className="hidden items-center gap-4 text-[12px] text-content-faint lg:flex">
          <span className="inline-flex items-center gap-1.5">
            <img src="/whatsapp.png" alt="" className="size-4" />
            <img src="/telegram.png" alt="" className="size-4" />
            WhatsApp &amp; Telegram
          </span>
          <span className="h-3 w-px bg-line" />
          <span className="inline-flex items-center gap-1.5">
            <Icon icon={SecurityLockIcon} size={13} />
            Secured by Nomba
          </span>
        </div>
      </div>
    </aside>
  );
}

function RightStream() {
  return (
    <main className="flex flex-col">
      <ProofChapter />
      <StepsChapter />
      <CollectChapter />
      <SplitChapter />
      <SaveChapter />
      <SendChapter />
      <AskChapter />
      <TrustChapter />
      <FaqChapter />
      <CtaChapter />
    </main>
  );
}

function Chapter({
  children,
  className,
  tone = "canvas",
}: {
  children: ReactNode;
  className?: string;
  tone?: "canvas" | "paper" | "ink";
}) {
  return (
    <section
      className={cn(
        "border-b px-6 py-16 sm:px-12 sm:py-20",
        tone === "canvas" && "border-hairline bg-inset/50",
        tone === "paper" && "border-hairline bg-paper",
        tone === "ink" && "border-white/10 bg-ink text-white",
        className
      )}
    >
      <div className="mx-auto w-full max-w-[620px] lg:mx-0">{children}</div>
    </section>
  );
}

function Kicker({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "text-[11.5px] font-semibold uppercase tracking-[0.16em]",
        onDark ? "text-iris-soft" : "text-iris-deep"
      )}
    >
      {children}
    </span>
  );
}

function Check({ className }: { className?: string }) {
  return <Icon icon={Tick02Icon} size={16} strokeWidth={2.5} className={cn("text-emerald", className)} />;
}

function Mark({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "box-decoration-clone rounded-[4px] px-1 font-semibold",
        onDark ? "bg-white/15 text-white" : "bg-iris/15 text-iris-deep"
      )}
    >
      {children}
    </span>
  );
}

function ChapterHeading({
  kicker,
  title,
  body,
  points,
  onDark,
}: {
  kicker: string;
  title: string;
  body: ReactNode;
  points?: string[];
  onDark?: boolean;
}) {
  return (
    <>
      <Kicker onDark={onDark}>{kicker}</Kicker>
      <h2 className="mt-4 font-display text-[28px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[34px]">
        {title}
      </h2>
      <p className={cn("mt-3 text-[15px] leading-relaxed", onDark ? "text-white/60" : "text-content-muted")}>
        {body}
      </p>
      {points ? (
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[13.5px] font-medium">
              <Check />
              {p}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function TgChat({ children, header }: { children: ReactNode; header?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#0e1420] bg-[#0b1120] p-3.5 shadow-[0_28px_70px_-40px_rgba(11,17,32,0.85)]">
      {header ? (
        <div className="mb-3 flex items-center gap-2.5 rounded-[13px] bg-white/[0.04] px-3 py-2">{header}</div>
      ) : null}
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function TgUserBubble({ children, time }: { children: ReactNode; time: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[86%] rounded-2xl rounded-tr-md bg-[#2b5278] px-4 py-3 text-[13px] leading-relaxed text-white">
        {children}
        <span className="mt-1.5 flex items-center justify-end gap-1 text-[10.5px] text-white/55">
          {time}
          <Icon icon={Tick02Icon} size={11} strokeWidth={2.5} className="text-[#6fc2ff]" />
        </span>
      </div>
    </div>
  );
}

function TgBotCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="w-fit max-w-[92%] rounded-2xl rounded-tl-md bg-[#182533] px-4 py-3 text-white">
        <div className="mb-2 text-[12.5px] font-bold text-[#e9a23b]">Talli</div>
        {children}
      </div>
    </div>
  );
}

function TgActions() {
  return (
    <div className="mt-3 flex gap-2">
      <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#22c55e]/15 px-4 py-2 text-[12.5px] font-semibold text-[#4ade80]">
        <Icon icon={Tick02Icon} size={13} strokeWidth={2.75} />
        Confirm
      </button>
      <button className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-4 py-2 text-[12.5px] font-semibold text-white/70">
        <Icon icon={Cancel01Icon} size={13} />
        Cancel
      </button>
    </div>
  );
}

function ReceiptThumb() {
  return (
    <div className="mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-[#0e1725]">
      <div className="w-[92px] rounded-[6px] bg-[#f4f2ec] px-3 py-2.5 shadow-md">
        <div className="mb-1.5 h-1.5 w-10 rounded-full bg-[#c9c4b8]" />
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="h-1 w-8 rounded-full bg-[#d8d3c6]" />
            <span className="h-1 w-4 rounded-full bg-[#d8d3c6]" />
          </div>
          <div className="flex items-center justify-between">
            <span className="h-1 w-9 rounded-full bg-[#d8d3c6]" />
            <span className="h-1 w-3 rounded-full bg-[#d8d3c6]" />
          </div>
          <div className="flex items-center justify-between">
            <span className="h-1 w-6 rounded-full bg-[#d8d3c6]" />
            <span className="h-1 w-4 rounded-full bg-[#d8d3c6]" />
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-[#cfc9bb] pt-1.5">
          <span className="h-1.5 w-7 rounded-full bg-[#9c988e]" />
          <span className="h-1.5 w-6 rounded-full bg-iris" />
        </div>
      </div>
    </div>
  );
}

function TgRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[12.5px] leading-relaxed">
      <span className="text-white/55">{label} </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ProofChapter() {
  return (
    <Chapter tone="paper" className="lg:py-14">
      <LiveChat />
      <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-content-faint">
        <Icon icon={Tick02Icon} size={13} strokeWidth={2.5} className="text-emerald" />
        This is Talli working — a real split, start to settled.
      </p>
    </Chapter>
  );
}

type ChatStep =
  | { kind: "user"; text: ReactNode }
  | { kind: "typing" }
  | { kind: "card" }
  | { kind: "pay"; who: string; initials: string; amount: string; tone: string; count: string };

const CHAT_SCRIPT: ChatStep[] = [
  { kind: "user", text: <><span className="text-[#8fd0ff]">@trytalli_bot</span> collect ₦5,000 from everyone for Saturday football</> },
  { kind: "typing" },
  { kind: "card" },
  { kind: "pay", who: "Ada", initials: "AD", amount: "₦5,000", tone: "bg-emerald", count: "1 of 6 paid" },
  { kind: "pay", who: "Tobi", initials: "TO", amount: "₦5,000", tone: "bg-iris", count: "2 of 6 paid" },
  { kind: "pay", who: "Chidi", initials: "CH", amount: "₦5,000", tone: "bg-amber", count: "3 of 6 paid" },
];

const STEP_DELAYS = [1500, 1100, 1700, 1400, 1400, 2600];

function LiveChat() {
  const [shown, setShown] = useState(1);

  useEffect(() => {
    const delay = STEP_DELAYS[(shown - 1) % STEP_DELAYS.length];
    const id = setTimeout(() => {
      setShown((s) => (s >= CHAT_SCRIPT.length ? 1 : s + 1));
    }, delay);
    return () => clearTimeout(id);
  }, [shown]);

  const steps = CHAT_SCRIPT.slice(0, shown);

  return (
    <div className="mx-auto max-w-[400px]">
      <div className="overflow-hidden rounded-[26px] border-[6px] border-[#0b1120] bg-[#0b1120] shadow-[0_36px_80px_-42px_rgba(11,17,32,0.9)]">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-[#131c2b] px-4 py-3">
          <span className="grad-chip flex size-8 items-center justify-center rounded-[10px] border border-white/10">
            <img src="/talli-logo.png" alt="" className="size-5 rounded-[5px]" />
          </span>
          <div className="flex-1">
            <div className="text-[13px] font-bold text-white">Saturday Squad</div>
            <div className="text-[10.5px] text-white/45">Talli · 6 members</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-medium text-white/60">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald/80" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald" />
            </span>
            live
          </span>
        </div>

        <div className="flex h-[420px] flex-col justify-end gap-2.5 overflow-hidden px-3.5 py-4">
          <AnimatePresence initial={false} mode="popLayout">
            {steps.map((step, i) => (
              <motion.div
                key={`${shown}-${i}`}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              >
                <ChatStepView step={step} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ChatStepView({ step }: { step: ChatStep }) {
  if (step.kind === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[86%] rounded-2xl rounded-tr-md bg-[#2b5278] px-4 py-2.5 text-[13px] leading-relaxed text-white">
          {step.text}
          <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/55">
            9:41 <Icon icon={Tick02Icon} size={11} strokeWidth={2.5} className="text-[#6fc2ff]" />
          </span>
        </div>
      </div>
    );
  }
  if (step.kind === "typing") {
    return (
      <div className="flex justify-start">
        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-[#182533] px-4 py-3">
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="size-1.5 rounded-full bg-white/50"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (step.kind === "card") {
    return (
      <div className="flex justify-start">
        <div className="w-full max-w-[92%] rounded-2xl rounded-tl-md bg-[#182533] px-4 py-3 text-white">
          <div className="mb-2 text-[12.5px] font-bold text-[#e9a23b]">Talli</div>
          <div className="text-[13px] font-semibold">💰 Create collection</div>
          <div className="mt-2 space-y-1">
            <TgRow label="Title:" value="Saturday football" />
            <TgRow label="Amount:" value="₦5,000 per person" />
            <TgRow label="Deadline:" value="Fri, 20 Jul" />
          </div>
          <div className="mt-2.5 text-[12.5px] font-medium">Should I create it?</div>
          <TgActions />
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="flex w-full max-w-[92%] items-center gap-3 rounded-2xl rounded-tl-md bg-[#182533] px-3.5 py-2.5 text-white">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white", step.tone)}>
          {step.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px]">
            🎉 <span className="font-semibold">{step.who}</span> just paid <span className="font-semibold">{step.amount}</span>
          </div>
          <div className="text-[11px] text-white/50">{step.count}</div>
        </div>
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald text-white">
          <Icon icon={Tick02Icon} size={11} strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Create from chat",
    body: (
      <>
        Say <Mark>“Collect ₦3,000 from everyone for Saturday football”</Mark> and Talli catches the
        amount, purpose and deadline — then asks you to confirm before it creates anything.
      </>
    ),
  },
  {
    title: "Members pay by transfer",
    body: "Everyone gets a clear payment instruction. No new app for members, no screenshots as proof, no matching bank alerts by hand.",
  },
  {
    title: "Talli keeps count",
    body: "As transfers reconcile, Talli updates the group — who’s paid, who’s pending, who still needs a nudge.",
  },
];

function StepsChapter() {
  return (
    <Chapter>
      <Kicker>The whole thing</Kicker>
      <h2 className="mt-4 font-display text-[30px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">
        From “who’s paying?” to paid.
      </h2>
      <ol className="relative mt-9">
        <span aria-hidden className="absolute bottom-4 left-[13px] top-3 w-px bg-gradient-to-b from-iris/40 via-line to-line" />
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-5 pb-8 last:pb-0">
            <span className="relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-iris/25 bg-iris-soft font-display text-[12px] font-bold text-iris-deep">
              {i + 1}
            </span>
            <div>
              <h3 className="font-display text-[18px] font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-content-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Chapter>
  );
}

function SplitChapter() {
  return (
    <Chapter tone="paper">
      <ChapterHeading
        kicker="Split a bill"
        title="Snap the receipt. Talli does the maths."
        body={
          <>
            Send a photo and tell Talli how to split it —{" "}
            <Mark>“Tunde pays ₦1.5m, I cover the rest.”</Mark> It reads every line and lays out who
            owes what before anything is set.
          </>
        }
        points={["Reads any receipt", "Split evenly or your way", "Confirm before it’s live"]}
      />
      <div className="mt-8">
        <TgChat>
          <TgUserBubble time="3:43 PM">
            <ReceiptThumb />
            <span className="text-[#8fd0ff]">@trytalli_bot</span> split this — Tunde pays ₦1.5m, Ade
            ₦8m, I cover the rest
          </TgUserBubble>
          <TgBotCard>
            <div className="text-[13px] font-semibold">✂️ Split — Klub Venix</div>
            <div className="mt-2 text-[12.5px] text-white/55">Total: <span className="font-semibold text-white">₦43,319,000</span></div>
            <div className="mt-2 space-y-1">
              <TgRow label="Tunde —" value="₦1,500,000" />
              <TgRow label="Ade —" value="₦8,000,000" />
              <TgRow label="You —" value="₦33,819,000" />
            </div>
            <div className="mt-2.5 text-[12.5px] font-medium">Should I set it up?</div>
            <TgActions />
          </TgBotCard>
        </TgChat>
      </div>
    </Chapter>
  );
}

function CollectChapter() {
  return (
    <Chapter>
      <ChapterHeading
        kicker="Collect money"
        title="Dues and contributions, minus the reminders."
        body={
          <>
            Say <Mark>“Collect ₦20 from everyone, target ₦50k before July 20.”</Mark> Talli opens the
            collection, gives everyone a pay button, tracks each transfer, and announces the count as
            it fills.
          </>
        }
        points={["Per-person or a target", "A pay button for everyone", "Live count in the chat"]}
      />
      <div className="mt-8">
        <TgChat
          header={
            <>
              <span className="grad-chip flex size-7 items-center justify-center rounded-[9px] border border-white/10">
                <img src="/talli-logo.png" alt="" className="size-4 rounded-[4px]" />
              </span>
              <div>
                <div className="text-[12px] font-bold text-white">Event Planning</div>
                <div className="text-[10px] text-white/45">Talli is in this chat</div>
              </div>
            </>
          }
        >
          <TgUserBubble time="4:04 PM">
            <span className="text-[#8fd0ff]">@trytalli_bot</span> collect ₦20 from everyone, target ₦50k
            before July 20
          </TgUserBubble>
          <TgBotCard>
            <div className="text-[13px] font-semibold">💰 Create collection</div>
            <div className="mt-2 space-y-1">
              <TgRow label="Title:" value="Event Planning" />
              <TgRow label="Amount:" value="₦20 per person" />
              <TgRow label="Target:" value="₦50,000" />
              <TgRow label="Deadline:" value="2026-07-20" />
            </div>
            <div className="mt-2.5 text-[12.5px] font-medium">Should I create it?</div>
            <TgActions />
          </TgBotCard>
          <TgBotCard>
            <div className="text-[12.5px] leading-relaxed">
              🎉 <span className="text-[#8fd0ff]">Benaiah</span> just paid <b>₦20</b> to Event Planning!
              <div className="mt-1 text-white/55">Collected: <span className="font-semibold text-white">₦40 of ₦50,000</span></div>
            </div>
          </TgBotCard>
        </TgChat>
      </div>
    </Chapter>
  );
}

function SaveChapter() {
  return (
    <Chapter tone="paper">
      <ChapterHeading
        kicker="Save toward goals"
        title="Put it away before it walks."
        body="Open a jar for rent, a trip or December — lock it to a date if you don’t trust yourself. It fills up beside everything else, so the whole picture is one glance away."
        points={["Lock it or keep it open", "Track it to the goal", "One wallet for all of it"]}
      />
      <div className="mt-8">
        <div className="rounded-[20px] border border-iris/10 bg-iris-soft/35 p-5 shadow-[0_16px_40px_-34px_rgba(86,54,196,0.35)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-faint">Rent jar · locked</span>
            <span className="inline-flex items-center gap-1 text-[10.5px] text-content-faint">
              <Icon icon={SecurityLockIcon} size={12} />
              Sept 1
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11.5px] text-content-muted">Saved</div>
              <div className="font-display text-[24px] font-bold tracking-tight">₦140,000</div>
            </div>
            <span className="text-[11px] text-content-faint">of ₦200,000</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-card/70">
            <div className="h-full w-[70%] rounded-full bg-iris" />
          </div>
          <div className="mt-2 text-[11.5px] font-medium text-content-muted">70% there — no dipping in till the date.</div>
        </div>
      </div>
    </Chapter>
  );
}

function SendChapter() {
  return (
    <Chapter>
      <ChapterHeading
        kicker="Send money"
        title="Smart about transfers. Never reckless."
        body={
          <>
            Talli understands <Mark>“Send ₦5,000 to Tunde 0123456789 GTBank”</Mark> — but it never
            moves money on its own. It shows the recipient and amount and waits for your confirmation
            first.
          </>
        }
        points={["Explicit confirmation", "Owner-only payouts", "Full audit log"]}
      />
      <div className="mt-8">
        <TgChat>
          <TgUserBubble time="5:20 PM">
            <span className="text-[#8fd0ff]">@trytalli_bot</span> send ₦5,000 to Tunde 0123456789 GTBank
          </TgUserBubble>
          <TgBotCard>
            <div className="text-[13px] font-semibold">📤 Send money</div>
            <div className="mt-2 space-y-1">
              <TgRow label="To:" value="Tunde · GTBank" />
              <TgRow label="Account:" value="0123456789" />
              <TgRow label="Amount:" value="₦5,000" />
            </div>
            <div className="mt-2.5 text-[12.5px] font-medium">Confirm this transfer?</div>
            <TgActions />
          </TgBotCard>
        </TgChat>
      </div>
    </Chapter>
  );
}

function AskChapter() {
  const asks = ["Who has paid?", "Who hasn’t paid?", "How much remains?", "Did Tunde pay?", "Remind unpaid members", "Show my receipt"];
  return (
    <Chapter tone="paper">
      <ChapterHeading
        kicker="Ask Talli anything"
        title="Answers from the records, not guesswork."
        body="Once a collection is live, anyone in the group can just ask — and Talli replies from the actual payment data."
      />
      <div className="mt-7 flex flex-wrap gap-2.5">
        {asks.map((a) => (
          <span
            key={a}
            className="rounded-full border border-line bg-canvas px-3.5 py-2 text-[13px] font-medium text-content-muted"
          >
            “{a}”
          </span>
        ))}
      </div>
    </Chapter>
  );
}

function TrustChapter() {
  const points = [
    { title: "It’s real transfers, not IOUs", body: "Money moves by bank transfer through Nomba. No tabs to settle later, no card details kept." },
    { title: "Confirmed on its own", body: "Talli watches for each transfer and ticks it off the second it lands — no “check again, I sent it.”" },
    { title: "Counted to the naira", body: "One wallet, one clear history. You always know who’s in and who’s not." },
  ];
  return (
    <Chapter tone="ink">
      <ChapterHeading
        onDark
        kicker="Money you can trust"
        title="Actual money, actually tracked."
        body="Talli isn’t a group spreadsheet you argue over — it’s real payments, counted as they happen."
      />
      <div className="mt-9 divide-y divide-white/10 border-y border-white/10">
        {points.map((p) => (
          <div key={p.title} className="flex gap-4 py-5">
            <Icon icon={Tick02Icon} size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-iris-soft" />
            <div>
              <div className="font-display text-[15px] font-bold tracking-tight">{p.title}</div>
              <div className="mt-1 text-[13px] leading-relaxed text-white/55">{p.body}</div>
            </div>
          </div>
        ))}
      </div>
    </Chapter>
  );
}

const FAQS = [
  {
    q: "Do group members need an account?",
    a: "No. Members pay through the shared payment flow. Only the person setting up and managing the collection needs a Talli account.",
  },
  {
    q: "Does Talli work in WhatsApp groups?",
    a: "Telegram supports full group flows today. On WhatsApp, Talli focuses on private chat — WhatsApp’s group bot support is more limited.",
  },
  {
    q: "Can AI move money on its own?",
    a: "Never. Talli uses AI to understand requests and prepare actions, but every financial action needs your confirmation and passes deterministic backend checks.",
  },
  {
    q: "How are payments tracked?",
    a: "Talli creates the payment instruction, reconciles the status, and updates the wallet, collection or savings record once the transfer is confirmed — not from a screenshot or a promise.",
  },
  {
    q: "Is Talli a bank?",
    a: "No. Payments are powered by Nomba; Talli handles the tracking, collections, savings jars, reminders and records. It’s a chat-native treasurer, not a bank.",
  },
];

function FaqChapter() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Chapter>
      <Kicker>Questions</Kicker>
      <h2 className="mt-4 font-display text-[28px] font-bold tracking-[-0.03em] sm:text-[34px]">Before you ask.</h2>
      <div className="mt-8 flex flex-col gap-2.5">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className={cn(
                "overflow-hidden rounded-[14px] border transition-colors",
                isOpen ? "border-iris/25 bg-paper shadow-soft" : "border-hairline bg-paper/60"
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
              >
                <span className="text-[15px] font-semibold">{item.q}</span>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                    isOpen ? "bg-iris text-white" : "bg-inset text-content-muted"
                  )}
                >
                  <Icon icon={isOpen ? MinusSignIcon : PlusSignIcon} size={15} />
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 text-[14px] leading-relaxed text-content-muted">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Chapter>
  );
}

function CtaChapter() {
  return (
    <section className="px-6 py-16 sm:px-12 sm:py-20">
      <div className="band-iris relative overflow-hidden rounded-[26px] px-8 py-14 text-white shadow-hero">
        <h2 className="font-display text-[32px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[42px]">
          Stop chasing.
          <br />
          Let Talli count.
        </h2>
        <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/75">
          Your first split takes under a minute to set up. Talli handles the rest.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Button asChild size="lg" variant="secondary" trailingIcon={<Icon icon={ArrowRight01Icon} size={17} />}>
            <Link to="/auth">Get started free</Link>
          </Button>
          <span className="text-[12px] text-white/60">No card needed.</span>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row sm:px-12">
        <Link to="/" className="flex items-center gap-2.5">
          <TalliLogo className="h-7" />
          <span className="font-display text-[16px] font-bold tracking-tight">Talli</span>
        </Link>
        <p className="text-[12.5px] text-content-faint">Money, handled together · Secured by Nomba · Nigeria</p>
        <div className="flex items-center gap-5 text-[13px] font-medium text-content-muted">
          <Link to="/auth" className="transition-colors hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
