import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { z } from "zod";
import { authApi } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";
import { LogoMark } from "@/components/brand/logo";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
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
      if (redirect) {
        router.history.push(redirect);
        return;
      }
      navigate({ to: "/home" });
    },
    onError: () => toast.error("Invalid or expired code."),
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-screen p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (stage === "email") requestOtp.mutate({ email, mode: "login" });
          else verifyOtp.mutate({ email, code });
        }}
        className="w-full max-w-sm space-y-6 rounded-[20px] border border-hairline bg-card p-8 shadow-card"
      >
        <header className="space-y-4">
          <LogoMark size={26} />
          <div className="space-y-1.5">
            <h1 className="font-serif text-[32px] leading-none">Sign in to Talli</h1>
            <p className="text-sm text-content-muted">
              We'll email you a 6-digit code. No passwords.
            </p>
          </div>
        </header>

        {stage === "email" ? (
          <Field label="Email">
            <Input
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        ) : (
          <Field label="6-digit code">
            <Input
              type="text"
              inputMode="numeric"
              required
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="tabular text-center tracking-[0.3em]"
            />
          </Field>
        )}

        <Button
          type="submit"
          size="lg"
          block
          disabled={requestOtp.isPending || verifyOtp.isPending}
        >
          {stage === "email" ? "Send code" : "Verify code"}
        </Button>

        {stage === "code" ? (
          <button
            type="button"
            onClick={() => setStage("email")}
            className="w-full text-sm text-content-muted transition-colors hover:text-content"
          >
            Use a different email
          </button>
        ) : null}
      </form>
    </main>
  );
}
