import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import { z } from "zod";
import {
  authNameFieldSchema,
  requestOtpSchema,
  verifyOtpSchema,
  type AuthFormValues,
} from "@/api/http/v1/auth/auth.types";
import { useRequestOtp, useVerifyOtp } from "@/api/http/v1/auth/auth.hooks";

type AuthStage = "details" | "code";

interface UseAuthFormOptions {
  stage: AuthStage;
  setStage: (stage: AuthStage) => void;
  redirect?: string;
  onSignedIn: () => void;
}

export function useAuthForm({ stage, setStage, redirect, onSignedIn }: UseAuthFormOptions) {
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const form = useForm({
    defaultValues: {
      mode: "login" as AuthFormValues["mode"],
      name: "",
      email: "",
      code: "",
    } satisfies AuthFormValues,
    onSubmit: async ({ value }) => {
      try {
        if (stage === "details") {
          const payload = requestOtpSchema.parse({ email: value.email, mode: value.mode });
          if (value.mode === "signup") {
            authNameFieldSchema.parse(value.name);
          }
          await requestOtp.mutateAsync(payload);
          setStage("code");
          toast.success("Check your inbox for a 6-digit code.");
          return;
        }

        const payload = verifyOtpSchema.parse({
          email: value.email,
          code: value.code,
          name: value.mode === "signup" ? value.name.trim() : undefined,
        });
        await verifyOtp.mutateAsync(payload);
        toast.success(value.mode === "signup" ? "Welcome to Talli 🎉" : "Signed in.");
        if (redirect) {
          onSignedIn();
          return;
        }
        onSignedIn();
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.issues[0]?.message ?? "Invalid input.");
          return;
        }
        if (stage === "details") {
          toast.error("Couldn't send the code. Try again.");
          return;
        }
        toast.error("Invalid or expired code.");
      }
    },
  });

  return {
    form,
    busy: requestOtp.isPending || verifyOtp.isPending,
    verifyPending: verifyOtp.isPending,
  };
}

export type AuthForm = ReturnType<typeof useAuthForm>["form"];
