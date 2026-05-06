import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { authApi } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");

  const requestOtp = useMutation({
    mutationFn: authApi.requestOtp,
    onSuccess: () => {
      setStage("code");
      toast.success("Check your inbox for a 6-digit code.");
    },
    onError: () => toast.error("Couldn't send the code. Try again."),
  });

  const verifyOtp = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: () => {
      toast.success("Signed in.");
      navigate({ to: "/dashboard" });
    },
    onError: () => toast.error("Invalid or expired code."),
  });

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (stage === "email") requestOtp.mutate({ email, mode: "login" });
          else verifyOtp.mutate({ email, code });
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-8 shadow-sm"
      >
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted">
            We'll email you a 6-digit code. No passwords.
          </p>
        </header>

        {stage === "email" ? (
          <input
            type="email"
            required
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand-300"
          />
        ) : (
          <input
            type="text"
            inputMode="numeric"
            required
            autoFocus
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-center tracking-[0.3em] outline-none focus:ring-2 focus:ring-brand-300"
          />
        )}

        <button
          type="submit"
          disabled={requestOtp.isPending || verifyOtp.isPending}
          className="w-full rounded-lg bg-brand-500 px-4 py-2 font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {stage === "email" ? "Send code" : "Verify code"}
        </button>

        {stage === "code" ? (
          <button
            type="button"
            onClick={() => setStage("email")}
            className="w-full text-sm text-muted hover:text-ink"
          >
            Use a different email
          </button>
        ) : null}
      </form>
    </main>
  );
}
