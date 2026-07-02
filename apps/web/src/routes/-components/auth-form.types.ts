export type { AuthForm } from "./use-auth-form";

export function fieldHint(errors: readonly unknown[]): string | undefined {
  const message = errors
    .map((error) =>
      typeof error === "string" ? error : (error as { message?: string }).message
    )
    .filter(Boolean)
    .join(", ");
  return message || undefined;
}
