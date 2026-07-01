import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { z } from "zod";
import { cn } from "@app/ui";
import type { AuthFormValues } from "@/api/http/v1/auth/auth.types";
import { TalliLogo } from "@/components/brand/talli-logo";
import { Button, TallyWatermark } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { BankIcon, Invoice01Icon, LockIcon, SparklesIcon, UserGroupIcon } from "@benrobo/iconary/core/duotone-rounded";
import { CreateAccountForm } from "./-components/create-account-form";
import { LoginForm } from "./-components/login-form";
import { OtpForm } from "./-components/otp-form";
import { useAuthForm } from "./-components/use-auth-form";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  component: AuthPage,
});

type Mode = AuthFormValues["mode"];
type Stage = "details" | "code";

const HIGHLIGHTS = [
  {
    icon: Invoice01Icon,
    title: "Split any bill",
    body: "Snap a receipt — everyone pays for what they had.",
    chip: "border-[#8b7bff]/25 bg-[#8b7bff]/20",
    tint: "text-[#b3a8ff]",
  },
  {
    icon: UserGroupIcon,
    title: "Collect from a group",
    body: "Dues, contributions, rent — tracked automatically.",
    chip: "border-emerald-400/25 bg-emerald-400/15",
    tint: "text-emerald-300",
  },
  {
    icon: BankIcon,
    title: "Money that moves",
    body: "Pay by transfer, get instant confirmations.",
    chip: "border-amber-400/25 bg-amber-400/15",
    tint: "text-amber-300",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();

  const [stage, setStage] = useState<Stage>("details");

  const { form, busy, verifyPending } = useAuthForm({
    stage,
    setStage,
    redirect,
    onSignedIn: () => {
      if (redirect) {
        router.history.push(redirect);
        return;
      }
      navigate({ to: "/app/home" });
    },
  });

  function switchMode(next: Mode) {
    form.setFieldValue("mode", next);
    setStage("details");
    form.setFieldValue("code", "");
  }

  return (
    <main className="flex min-h-dvh bg-screen">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <motion.div
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], layout: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <TalliLogo className="mb-4 h-11" />
          </div>

          <div className="rounded-[24px] border border-hairline bg-card p-8 shadow-lift">
            <form.Subscribe selector={(state) => ({ mode: state.values.mode, email: state.values.email })}>
              {({ mode, email }) => (
                <>
                  <div className="mb-6">
                    <div className="mb-5 inline-flex rounded-full bg-inset p-1">
                      {(["login", "signup"] as Mode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => switchMode(m)}
                          className="relative rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors"
                        >
                          {mode === m ? (
                            <motion.span
                              layoutId="auth-mode-pill"
                              className="absolute inset-0 rounded-full bg-card shadow-card"
                              transition={{ type: "spring", stiffness: 400, damping: 32 }}
                            />
                          ) : null}
                          <span className={mode === m ? "relative text-foreground" : "relative text-content-muted"}>
                            {m === "login" ? "Sign in" : "Create account"}
                          </span>
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.h1
                        key={`${mode}-${stage}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="font-display text-[27px] font-bold leading-tight tracking-[-0.02em]"
                      >
                        {stage === "code"
                          ? "Enter your code"
                          : mode === "login"
                            ? "Welcome back"
                            : "Create your account"}
                      </motion.h1>
                    </AnimatePresence>
                    <p className="mt-1.5 text-[13.5px] text-content-muted">
                      {stage === "code"
                        ? `We sent a 6-digit code to ${email}.`
                        : "We'll email you a 6-digit code. No passwords."}
                    </p>
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void form.handleSubmit();
                    }}
                    className="space-y-4"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {stage === "code" ? (
                        <OtpForm
                          form={form}
                          verifyPending={verifyPending}
                          onComplete={() => void form.handleSubmit()}
                        />
                      ) : mode === "login" ? (
                        <LoginForm form={form} />
                      ) : (
                        <CreateAccountForm form={form} />
                      )}
                    </AnimatePresence>

                    {stage === "details" ? (
                      <>
                        <Button type="submit" size="lg" block loading={busy}>
                          Send code
                        </Button>
                        <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-content-faint">
                          <Icon icon={LockIcon} size={12} />
                          Passwordless & secure
                        </p>
                      </>
                    ) : (
                      <>
                        <Button type="submit" size="lg" block loading={busy}>
                          Verify & continue
                        </Button>
                        <button
                          type="button"
                          onClick={() => setStage("details")}
                          className="w-full text-[13px] text-content-muted transition-colors hover:text-foreground"
                        >
                          ← Use a different email
                        </button>
                      </>
                    )}
                  </form>
                </>
              )}
            </form.Subscribe>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-[-4px] bottom-[0.08em] z-0 h-[0.42em] origin-left -skew-x-6 rounded-[3px] bg-iris/50"
      />
      <span className="relative z-10">{children}</span>
    </span>
  );
}

function BrandPanel() {
  return (
    <div className="band-night relative hidden w-[46%] max-w-[560px] overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(120% 90% at 30% 20%, black 0%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 30% 20%, black 0%, transparent 72%)",
        }}
      />
      <TallyWatermark className="-right-16 -top-10 size-80 text-white" opacity={0.06} />

      <div className="relative">
        <TalliLogo />
      </div>

      <div className="relative">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-medium text-white/80">
          <Icon icon={SparklesIcon} size={13} className="text-white/80" />
          Your money, handled
        </span>
        <h2 className="mb-8 font-display text-[32px] font-bold leading-[1.22] tracking-[-0.02em] text-white">
          <Highlight>Split bills</Highlight>, collect from groups, and{" "}
          <Highlight>move money</Highlight> — all in chat.
        </h2>
        <div className="space-y-5">
          {HIGHLIGHTS.map((h, i) => (
            <motion.div
              key={h.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
              className="flex items-start gap-3.5"
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", h.chip)}>
                <Icon icon={h.icon} size={18} className={h.tint} />
              </span>
              <div>
                <div className="text-[14px] font-semibold text-white">{h.title}</div>
                <div className="text-[13px] text-white/55">{h.body}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative text-[12px] text-white/40">Secured by Nomba · Nigeria</div>
    </div>
  );
}
