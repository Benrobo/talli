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
      <SiteHeader />
      <Hero />
      <ProblemBand />
      <Thesis />
      <ProductShot />
      <CollectChapter />
      <SplitChapter />
      <SaveChapter />
      <SendChapter />
      <AskStrip />
      <ScenarioWall />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <TalliLogo className="h-8" />
          <span className="font-display text-[19px] font-bold tracking-tight">Talli</span>
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-[13.5px] font-medium text-content-muted md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function PixelEyebrow({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "font-mono text-[11.5px] font-semibold uppercase tracking-[0.28em]",
        onDark ? "text-iris-soft" : "text-iris-deep"
      )}
    >
      {children}
    </span>
  );
}

function StruckWord({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap text-iris">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 28"
        preserveAspectRatio="none"
        className="absolute left-[-3%] top-1/2 h-[0.5em] w-[106%] -translate-y-[36%] text-iris/40"
        fill="none"
      >
        <path d="M3 22 L197 7" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-stretch lg:grid-cols-[1fr_0.92fr]">
        <div className="flex flex-col justify-center px-6 py-16 sm:px-8 lg:py-24">
          <PixelEyebrow>Built for chat</PixelEyebrow>
          <h1 className="mt-6 font-display text-[3.5rem] font-bold leading-[0.95] tracking-[-0.045em]">
            Collect money where you already talk.
            <br />
            Talli keeps the <StruckWord>count</StruckWord>.
          </h1>
          <p className="mt-7 max-w-[440px] text-[16px] leading-relaxed text-content-muted sm:text-[17px]">
            Message Talli to open a collection, savings jar, or payout. Transfers reconcile on
            their own — payment status stays in the conversation, not a spreadsheet.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" trailingIcon={<Icon icon={ArrowRight01Icon} size={17} />}>
              <Link to="/auth">Start free</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/auth">See how it works</Link>
            </Button>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-content-muted">
            <li className="flex items-center gap-1.5"><Check /> Free to start</li>
            <li className="flex items-center gap-1.5"><Check /> No card needed</li>
            <li className="flex items-center gap-1.5"><Check /> WhatsApp &amp; Telegram</li>
          </ul>
        </div>

        <div className="t-dither relative flex items-center justify-center border-t border-hairline px-6 py-14 sm:px-10 lg:border-l lg:border-t-0">
          <div className="relative w-full max-w-[400px]">
            <div className="absolute -right-3 -top-5 z-10 hidden items-center gap-2 rounded-[13px] border border-hairline bg-paper px-3 py-2 shadow-lift sm:flex">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-soft text-emerald-deep">
                🎉
              </span>
              <div className="leading-tight">
                <div className="text-[12px] font-bold">Ada just paid ₦5,000</div>
                <div className="text-[10.5px] text-content-faint">1 of 6 · counting…</div>
              </div>
            </div>
            <LiveChat />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemBand() {
  const qs = ["Who has paid?", "Who hasn’t paid?", "How much have we collected?", "Did that transfer land?", "Who needs a reminder?"];
  return (
    <section className="band-night relative overflow-hidden text-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 sm:py-24">
        <PixelEyebrow onDark>Sound familiar?</PixelEyebrow>
        <h2 className="mt-5 max-w-[720px] font-display text-[32px] font-bold leading-[1.06] tracking-[-0.035em] sm:text-[44px]">
          Group money already happens in chat.
          <span className="text-white/45"> The tracking is still manual.</span>
        </h2>
        <p className="mt-5 max-w-[560px] text-[15.5px] leading-relaxed text-white/60">
          Someone collects for football. Someone pays for dinner. Someone manages estate dues. Then
          the same questions come round again and again:
        </p>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {qs.map((q) => (
            <span
              key={q}
              className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-white/80"
            >
              {q}
            </span>
          ))}
        </div>
        <p className="mt-8 max-w-[560px] text-[15.5px] leading-relaxed text-white/75">
          Talli turns those money conversations into <Mark onDark>tracked payment flows</Mark> — so
          nobody has to chase, guess, or argue.
        </p>
      </div>
    </section>
  );
}

function Thesis() {
  return (
    <section id="how" className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1200px] px-6 py-20 sm:py-24">
        <div className="max-w-[640px]">
          <PixelEyebrow>You run the group. Talli runs the money.</PixelEyebrow>
          <h2 className="mt-5 font-display text-[32px] font-bold leading-[1.06] tracking-[-0.035em] sm:text-[40px]">
            From “abeg send your money” to clear payment status.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-3">
          <ThesisStep
            n="01"
            title="Create from chat"
            body={<>Tell Talli <Mark>“Collect ₦3,000 from everyone for Saturday football.”</Mark> It catches the amount, purpose and deadline, then asks you to confirm.</>}
            mock={<MockCollectCreate />}
          />
          <ThesisStep
            n="02"
            title="Members pay by transfer"
            body="Each person gets a clear payment instruction. No new app for members, no screenshots as proof, no matching bank alerts by hand."
            mock={<MockPayInstruction />}
          />
          <ThesisStep
            n="03"
            title="Talli keeps count"
            body="As transfers reconcile, Talli updates the group — exactly who’s paid, who’s pending, and who still needs a nudge."
            mock={<MockCount />}
          />
        </div>
      </div>
    </section>
  );
}

function ThesisStep({ n, title, body, mock }: { n: string; title: string; body: ReactNode; mock: ReactNode }) {
  return (
    <div>
      <div className="mb-4 overflow-hidden rounded-[16px] border border-hairline bg-canvas p-3.5">{mock}</div>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[13px] font-bold text-iris">{n}</span>
        <h3 className="font-display text-[19px] font-bold tracking-tight">{title}</h3>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-content-muted">{body}</p>
    </div>
  );
}

function MockCollectCreate() {
  return (
    <div className="rounded-[11px] bg-[#182533] px-3.5 py-3 text-white">
      <div className="mb-1.5 text-[11.5px] font-bold text-[#e9a23b]">Talli</div>
      <div className="text-[12.5px] font-semibold">💰 Create collection</div>
      <div className="mt-1.5 space-y-0.5 text-[11.5px] text-white/60">
        <div>Amount: <span className="font-semibold text-white">₦3,000</span></div>
        <div>Deadline: <span className="font-semibold text-white">Sat</span></div>
      </div>
      <div className="mt-2 flex gap-1.5">
        <span className="rounded-md bg-[#22c55e]/15 px-2.5 py-1 text-[11px] font-semibold text-[#4ade80]">Confirm</span>
        <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/60">Cancel</span>
      </div>
    </div>
  );
}

function MockPayInstruction() {
  return (
    <div className="rounded-[11px] bg-[#182533] px-3.5 py-3 text-white">
      <div className="mb-1.5 text-[11.5px] font-bold text-[#e9a23b]">Talli</div>
      <div className="text-[12px]">💸 <span className="text-[#8fd0ff]">Chidi</span>, pay ₦3,000</div>
      <div className="mt-2 rounded-lg bg-white/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/70">
        Account <span className="font-mono font-semibold text-white">5174408377</span>
        <br />Nombank MFB
      </div>
      <div className="mt-1.5 text-[10.5px] text-white/45">Confirms automatically once it lands.</div>
    </div>
  );
}

function MockCount() {
  return (
    <div className="rounded-[11px] border border-hairline bg-paper px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-content-muted">Saturday football</span>
        <span className="text-[11px] font-semibold text-emerald-deep">9 / 12</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-inset">
        <div className="h-full w-3/4 rounded-full bg-iris" />
      </div>
      <div className="mt-2.5 space-y-1.5">
        {[["Ada", true], ["Tunde", true], ["Bola", false]].map(([nm, ok]) => (
          <div key={nm as string} className="flex items-center justify-between text-[11.5px]">
            <span className="font-medium">{nm}</span>
            <span className={cn("font-medium", ok ? "text-emerald-deep" : "text-amber-deep")}>
              {ok ? "Paid" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductShot() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-[620px] text-center">
          <PixelEyebrow>One clear view</PixelEyebrow>
          <h2 className="mt-5 font-display text-[32px] font-bold leading-[1.06] tracking-[-0.035em] sm:text-[40px]">
            The chat does the work. The dashboard keeps the record.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-content-muted">
            Every collection, split, jar and transfer, tracked to the naira — with a full history you
            can actually trust.
          </p>
        </div>
        <div className="t-dither mt-12 rounded-[24px] border border-hairline p-4 sm:p-8">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}

function DashboardMock() {
  const stats = [
    { label: "Collected", value: "₦326,900", tone: "filled" },
    { label: "Active collections", value: "4", tone: "light" },
    { label: "In savings jars", value: "₦140,000", tone: "light" },
  ];
  return (
    <div className="overflow-hidden rounded-[16px] border border-hairline bg-paper shadow-[0_30px_70px_-46px_rgba(23,20,39,0.5)]">
      <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-3">
        <span className="grad-chip flex size-7 items-center justify-center rounded-[9px] border border-hairline">
          <img src="/talli-logo.png" alt="" className="size-4 rounded-[4px]" />
        </span>
        <span className="font-display text-[14px] font-bold">Overview</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-inset" />
          <span className="size-2 rounded-full bg-inset" />
          <span className="size-2 rounded-full bg-inset" />
        </span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={cn(
                "rounded-[14px] p-4",
                s.tone === "filled" ? "band-iris text-white shadow-hero" : "border border-hairline bg-card"
              )}
            >
              <div className={cn("text-[11px]", s.tone === "filled" ? "text-white/70" : "text-content-muted")}>
                {s.label}
              </div>
              <div className={cn("mt-1 font-display text-[20px] font-bold tracking-tight", s.tone !== "filled" && "text-foreground")}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[14px] border border-hairline bg-card p-4">
            <div className="mb-2 text-[12px] font-semibold">Active collections</div>
            {[["Saturday football", "9/12"], ["Estate dues", "7/12"], ["Office lunch", "done"]].map(([t, m]) => (
              <div key={t as string} className="flex items-center justify-between border-b border-hairline-soft py-2 text-[12px] last:border-0">
                <span className="font-medium">{t}</span>
                <span className="tabular text-content-muted">{m}</span>
              </div>
            ))}
          </div>
          <div className="rounded-[14px] border border-hairline bg-card p-4">
            <div className="mb-2 text-[12px] font-semibold">Recent activity</div>
            {[["Ada paid ₦5,000", "now"], ["Tobi paid ₦2,800", "3m"], ["Rent jar +₦20,000", "1h"]].map(([t, m]) => (
              <div key={t as string} className="flex items-center justify-between border-b border-hairline-soft py-2 text-[12px] last:border-0">
                <span className="flex items-center gap-2">
                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald text-white">
                    <Icon icon={Tick02Icon} size={9} strokeWidth={3} />
                  </span>
                  {t}
                </span>
                <span className="tabular text-content-faint">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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

function FeatureChapter({
  id,
  tone,
  kicker,
  title,
  body,
  points,
  mock,
  reverse,
}: {
  id?: string;
  tone?: "canvas" | "paper";
  kicker: string;
  title: string;
  body: ReactNode;
  points: string[];
  mock: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={id} className={cn("border-b border-hairline", tone === "paper" ? "bg-paper" : "bg-canvas")}>
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-6 py-20 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div className={cn(reverse && "lg:order-2")}>
          <PixelEyebrow>{kicker}</PixelEyebrow>
          <h2 className="mt-5 font-display text-[28px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[34px]">{title}</h2>
          <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-content-muted">{body}</p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[13.5px] font-medium">
                <Check /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className={cn("relative", reverse && "lg:order-1")}>{mock}</div>
      </div>
    </section>
  );
}

function CollectChapter() {
  return (
    <FeatureChapter
      id="features"
      tone="canvas"
      kicker="Collect money"
      title="Dues and contributions, minus the reminders."
      body={<>Name the amount and deadline — <Mark>“Collect ₦20 from everyone, target ₦50k before July 20.”</Mark> Talli opens the collection, gives everyone a pay button, and announces the count as it fills.</>}
      points={["Per-person or a target", "A pay button for everyone", "Live count in the chat"]}
      mock={
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
            <span className="text-[#8fd0ff]">@trytalli_bot</span> collect ₦20 from everyone, target ₦50k before July 20
          </TgUserBubble>
          <TgBotCard>
            <div className="text-[13px] font-semibold">💰 Create collection</div>
            <div className="mt-2 space-y-1">
              <TgRow label="Title:" value="Event Planning" />
              <TgRow label="Amount:" value="₦20 per person" />
              <TgRow label="Target:" value="₦50,000" />
            </div>
            <div className="mt-2.5 text-[12.5px] font-medium">Should I create it?</div>
            <TgActions />
          </TgBotCard>
          <TgBotCard>
            <div className="text-[12.5px] leading-relaxed">
              🎉 <span className="text-[#8fd0ff]">Benaiah</span> just paid <b>₦20</b>
              <div className="mt-1 text-white/55">Collected: <span className="font-semibold text-white">₦40 of ₦50,000</span></div>
            </div>
          </TgBotCard>
        </TgChat>
      }
    />
  );
}

function SplitChapter() {
  return (
    <FeatureChapter
      tone="paper"
      reverse
      kicker="Split a bill"
      title="Snap the receipt. Talli does the maths."
      body={<>Send a photo and say how to split it — <Mark>“Tunde pays ₦1.5m, I cover the rest.”</Mark> Talli reads every line and lays out who owes what before anything is set.</>}
      points={["Reads any receipt", "Split evenly or your way", "Confirm before it’s live"]}
      mock={
        <TgChat>
          <TgUserBubble time="3:43 PM">
            <ReceiptThumb />
            <span className="text-[#8fd0ff]">@trytalli_bot</span> split this — Tunde pays ₦1.5m, Ade ₦8m, I cover the rest
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
      }
    />
  );
}

function SaveChapter() {
  return (
    <FeatureChapter
      tone="canvas"
      kicker="Save toward goals"
      title="Put it away before it walks."
      body={<>Open a jar for rent, school fees or December — <Mark>“Save ₦2,000 to my rent jar.”</Mark> Lock it to a date if you don’t trust yourself, and ask Talli for your progress anytime.</>}
      points={["Lock it or keep it open", "Track it to the goal", "One wallet for all of it"]}
      mock={
        <div className="rounded-[18px] border border-hairline bg-paper p-6 shadow-[0_24px_60px_-46px_rgba(23,20,39,0.5)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-faint">Rent jar · locked</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-content-faint">
              <Icon icon={SecurityLockIcon} size={12} /> Sept 1
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11.5px] text-content-muted">Saved</div>
              <div className="font-display text-[28px] font-bold tracking-tight">₦140,000</div>
            </div>
            <span className="text-[11.5px] text-content-faint">of ₦200,000</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-inset">
            <div className="h-full w-[70%] rounded-full bg-amber" />
          </div>
          <div className="mt-3 text-[12px] font-medium text-content-muted">70% there — no dipping in till the date.</div>
        </div>
      }
    />
  );
}

function SendChapter() {
  return (
    <FeatureChapter
      tone="paper"
      reverse
      kicker="Send money"
      title="Smart about transfers. Never reckless."
      body={<>Talli understands <Mark>“Send ₦5,000 to Tunde 0123456789 GTBank”</Mark> — but it never moves money on its own. It shows the recipient and amount and waits for your confirmation.</>}
      points={["Explicit confirmation", "Owner-only payouts", "Full audit log"]}
      mock={
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
      }
    />
  );
}

function AskStrip() {
  const asks = ["Who has paid?", "Who hasn’t paid?", "How much remains?", "Did Tunde pay?", "Remind unpaid members", "Show my receipt"];
  return (
    <section className="border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-[1200px] px-6 py-20 sm:py-24">
        <div className="max-w-[620px]">
          <PixelEyebrow>Ask Talli anything</PixelEyebrow>
          <h2 className="mt-5 font-display text-[30px] font-bold leading-[1.06] tracking-[-0.035em] sm:text-[38px]">
            Answers from the records, not guesswork.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-content-muted">
            Once a collection is live, anyone in the group can just ask — and Talli replies from the
            actual payment data.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {asks.map((a) => (
            <span key={a} className="rounded-full border border-hairline bg-paper px-4 py-2 text-[13.5px] font-medium text-content-muted shadow-soft">
              “{a}”
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const SCENARIOS = [
  { text: <>“Someone collects <Mark onDark>₦3,000 for Saturday football</Mark> — Talli tracks all 12 and pings the two who forgot.”</>, tag: "Football crew" },
  { text: <>“Estate dues used to be a WhatsApp spreadsheet. Now it’s <Mark onDark>one link and a live count</Mark>.”</>, tag: "Estate treasurer" },
  { text: <>“We split dinner by what everyone actually ate — <Mark onDark>no more covering for the big spender</Mark>.”</>, tag: "The group chat" },
  { text: <>“Flat rent, every month, <Mark onDark>collected without a single reminder from me</Mark>.”</>, tag: "Flatmates" },
  { text: <>“Office lunch money, sorted before the food arrives.”</>, tag: "Team lead" },
  { text: <>“Ask ‘who hasn’t paid?’ and get the truth, <Mark onDark>not a guess</Mark>.”</>, tag: "Class rep" },
];

function ScenarioWall() {
  return (
    <section className="band-night text-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 sm:py-24">
        <div className="max-w-[640px]">
          <PixelEyebrow onDark>What Talli replaces</PixelEyebrow>
          <h2 className="mt-5 font-display text-[32px] font-bold leading-[1.06] tracking-[-0.035em] sm:text-[42px]">
            The chasing, the spreadsheet, the “did you send it?”
          </h2>
        </div>
        <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {SCENARIOS.map((s, i) => (
            <div key={i} className="break-inside-avoid rounded-[16px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[14.5px] leading-relaxed text-white/85">{s.text}</p>
              <div className="mt-4 flex items-center gap-2 text-[12px] text-white/45">
                <span className="size-1.5 rounded-full bg-iris" />
                {s.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Do group members need an account?", a: "No. Members pay through the shared payment flow. Only the person setting up and managing the collection needs a Talli account." },
  { q: "Does Talli work in WhatsApp groups?", a: "Telegram supports full group flows today. On WhatsApp, Talli focuses on private chat — WhatsApp’s group bot support is more limited." },
  { q: "Can AI move money on its own?", a: "Never. Talli uses AI to understand requests and prepare actions, but every financial action needs your confirmation and passes deterministic backend checks." },
  { q: "How are payments tracked?", a: "Talli creates the payment instruction, reconciles the status, and updates the wallet, collection or savings record once the transfer is confirmed — not from a screenshot or a promise." },
  { q: "Is Talli a bank?", a: "No. Payments are powered by Nomba; Talli handles the tracking, collections, savings jars, reminders and records. It’s a chat-native treasurer, not a bank." },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-b border-hairline bg-paper">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-x-16 gap-y-8 px-6 py-20 sm:py-24 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <PixelEyebrow>Questions</PixelEyebrow>
          <h2 className="mt-5 font-display text-[30px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[38px]">
            Before you ask.
          </h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={cn(
                  "overflow-hidden rounded-[14px] border transition-colors",
                  isOpen ? "border-iris/25 bg-canvas shadow-soft" : "border-hairline bg-canvas/50"
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
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="band-iris relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] px-8 py-16 text-white shadow-hero sm:px-14">
        <div className="relative max-w-[620px]">
          <h2 className="font-display text-[34px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[48px]">
            Stop chasing people for money.
          </h2>
          <p className="mt-4 max-w-[440px] text-[15.5px] leading-relaxed text-white/75">
            Create the collection, share it in the group, and let Talli keep count.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Button asChild size="lg" variant="secondary" trailingIcon={<Icon icon={ArrowRight01Icon} size={17} />}>
              <Link to="/auth">Get started free</Link>
            </Button>
            <span className="text-[12.5px] text-white/60">No card needed.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <Link to="/" className="flex items-center gap-2.5">
          <TalliLogo className="h-7" />
          <span className="font-display text-[16px] font-bold tracking-tight">Talli</span>
        </Link>
        <p className="text-[12.5px] text-content-faint">The AI treasurer for money conversations in chat · Secured by Nomba · Nigeria</p>
        <div className="flex items-center gap-5 text-[13px] font-medium text-content-muted">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          <Link to="/auth" className="transition-colors hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}

/* ── Live chat player (hero) ─────────────────────────────────────── */

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
          {[["w-8", "w-4"], ["w-9", "w-3"], ["w-6", "w-4"]].map(([a, b], i) => (
            <div key={i} className="flex items-center justify-between">
              <span className={cn("h-1 rounded-full bg-[#d8d3c6]", a)} />
              <span className={cn("h-1 rounded-full bg-[#d8d3c6]", b)} />
            </div>
          ))}
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
