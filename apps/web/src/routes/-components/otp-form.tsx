import { motion } from "motion/react";
import { authCodeFieldSchema } from "@/api/http/v1/auth/auth.types";
import { Field, Input } from "@/components/ui";
import type { AuthForm } from "./auth-form.types";
import { fieldHint } from "./auth-form.types";

interface OtpFormProps {
  form: AuthForm;
  verifyPending: boolean;
  onComplete: () => void;
}

export function OtpForm({ form, verifyPending, onComplete }: OtpFormProps) {
  function applyCode(digits: string, handleChange: (value: string) => void) {
    handleChange(digits);
    if (digits.length === 6 && !verifyPending) {
      onComplete();
    }
  }

  return (
    <motion.div
      key="code"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
    >
      <form.Field
        name="code"
        validators={{
          onChange: ({ value }) => {
            const result = authCodeFieldSchema.safeParse(value);
            return result.success ? undefined : result.error.issues[0]?.message;
          },
          onBlur: ({ value }) => {
            const result = authCodeFieldSchema.safeParse(value);
            return result.success ? undefined : result.error.issues[0]?.message;
          },
        }}
        children={(field) => (
          <Field label="6-digit code" hint={fieldHint(field.state.meta.errors)}>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              invalid={field.state.meta.errors.length > 0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
                applyCode(digits, field.handleChange);
              }}
              onPaste={(event) => {
                event.preventDefault();
                const digits = event.clipboardData
                  .getData("text")
                  .replace(/\D/g, "")
                  .slice(0, 6);
                applyCode(digits, field.handleChange);
              }}
              className="tabular text-center text-[20px] tracking-[0.4em]"
            />
          </Field>
        )}
      />
    </motion.div>
  );
}
