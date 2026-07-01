import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FieldProps {
  label?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, hint, className, children }: FieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

interface InputProps extends React.ComponentProps<"input"> {
  invalid?: boolean;
}

function Input({ className, invalid, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full rounded-xl border bg-card px-4 py-3.5 text-[15px] font-medium text-foreground shadow-card transition-colors outline-none",
        "placeholder:font-normal placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid ? "border-destructive" : "border-input",
        className
      )}
      {...props}
    />
  );
}

export { Field, Input };
