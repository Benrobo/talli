import { motion } from "motion/react";
import { authEmailFieldSchema } from "@/api/http/v1/auth/auth.types";
import { Field, Input } from "@/components/ui";
import type { AuthForm } from "./auth-form.types";
import { fieldHint } from "./auth-form.types";

interface LoginFormProps {
  form: AuthForm;
}

export function LoginForm({ form }: LoginFormProps) {
  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
    >
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) => {
            const result = authEmailFieldSchema.safeParse(value);
            return result.success ? undefined : result.error.issues[0]?.message;
          },
          onBlur: ({ value }) => {
            const result = authEmailFieldSchema.safeParse(value);
            return result.success ? undefined : result.error.issues[0]?.message;
          },
        }}
        children={(field) => (
          <Field label="Email" hint={fieldHint(field.state.meta.errors)}>
            <Input
              type="email"
              autoFocus
              placeholder="you@example.com"
              invalid={field.state.meta.errors.length > 0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </Field>
        )}
      />
    </motion.div>
  );
}
