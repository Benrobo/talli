import { createFileRoute, Link } from "@tanstack/react-router";
import { TalliLogo } from "@/components/brand/talli-logo";
import { Button } from "@/components/ui";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas text-content">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgba(109,74,230,0.13) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-280px] h-[620px] w-[820px] -translate-x-1/2 rounded-full bg-iris/15 blur-[110px]"
      />

      <header className="relative mx-auto flex max-w-[1180px] items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <TalliLogo className="h-9" />
          <span className="font-display text-[20px] font-bold tracking-[-0.025em]">Talli</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-6 pb-16 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:pb-24 lg:pt-20">
        <div className="max-w-[590px]">
          <span className="inline-flex items-center rounded-full border border-iris/15 bg-card/65 px-3 py-1.5 text-[11.5px] font-semibold text-iris-deep shadow-soft backdrop-blur-sm">
            Group money, without the group headache
          </span>
          <h1 className="mt-6 font-display text-[48px] font-bold leading-[0.98] tracking-[-0.055em] sm:text-[62px]">
            Money in the chat.
            <span className="block text-iris">Clarity everywhere else.</span>
          </h1>
          <p className="mt-6 max-w-[510px] text-[16px] leading-relaxed text-content-muted sm:text-[18px]">
            Split receipts, collect contributions and track every payment without chasing people
            through endless messages.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start with Talli</Link>
            </Button>
            <span className="text-[12.5px] text-content-faint">Built for how groups already talk.</span>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {["Split bills", "Collect dues", "Track payments"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-hairline bg-card/60 px-3 py-1.5 text-[11.5px] font-medium text-content-muted"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[510px]">
          <div className="absolute -inset-8 rounded-[44px] bg-iris/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-card/90 p-5 shadow-win backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-content-faint">
                  Live bill split
                </div>
                <div className="mt-1.5 font-display text-[24px] font-bold tracking-[-0.03em]">
                  Friday dinner
                </div>
              </div>
              <span className="rounded-full bg-emerald-soft px-3 py-1.5 text-[11px] font-semibold text-emerald-deep">
                3 paying
              </span>
            </div>

            <div className="mt-6 space-y-2.5">
              {[
                ["Jollof rice", "₦4,500", "Femi"],
                ["Grilled fish", "₦7,200", "Ada"],
                ["Chapman", "₦2,800", "Available"],
              ].map(([item, amount, owner]) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[15px] border border-hairline bg-inset/65 px-4 py-3.5"
                >
                  <span
                    className={
                      owner === "Available"
                        ? "size-2 rounded-full bg-content-faint"
                        : "size-2 rounded-full bg-emerald"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{item}</div>
                    <div className="mt-0.5 text-[10.5px] text-content-faint">
                      {owner === "Available" ? "Ready to claim" : `Picked by ${owner}`}
                    </div>
                  </div>
                  <span className="font-display text-[13px] font-bold">{amount}</span>
                </div>
              ))}
            </div>

            <div className="band-iris mt-5 flex items-center justify-between rounded-[18px] p-4 text-white shadow-hero">
              <div>
                <div className="text-[10.5px] text-white/65">Collected so far</div>
                <div className="mt-0.5 font-display text-[22px] font-bold">₦11,700</div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] text-white/65">No awkward reminders</div>
                <div className="mt-1 text-[12px] font-semibold">Talli keeps score</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
