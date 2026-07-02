import { motion } from "motion/react";
import { authEmailFieldSchema, authNameFieldSchema } from "@/api/http/v1/auth/auth.types";
import { Field, Input } from "@/components/ui";
import type { AuthForm } from "./auth-form.types";
import { fieldHint } from "./auth-form.types";

interface CreateAccountFormProps {
  form: AuthForm;
}

export function CreateAccountForm({ form }: CreateAccountFormProps) {
  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div className="px-0.5 pb-4 pt-0.5">
          <form.Field
            name="name"
            validators={{
              onChangeListenTo: ["mode"],
              onChange: ({ value, fieldApi }) => {
                if (fieldApi.form.getFieldValue("mode") !== "signup") return undefined;
                const result = authNameFieldSchema.safeParse(value);
                return result.success ? undefined : result.error.issues[0]?.message;
              },
              onBlur: ({ value, fieldApi }) => {
                if (fieldApi.form.getFieldValue("mode") !== "signup") return undefined;
                const result = authNameFieldSchema.safeParse(value);
                return result.success ? undefined : result.error.issues[0]?.message;
              },
            }}
            children={(field) => (
              <Field label="Your name" hint={fieldHint(field.state.meta.errors)}>
                <Input
                  autoFocus
                  placeholder="Ada Obi"
                  invalid={field.state.meta.errors.length > 0}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Field>
            )}
          />
        </div>
      </motion.div>

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
