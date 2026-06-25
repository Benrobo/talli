import { Switch } from "@/components/ui/switch";

interface ToggleProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  className?: string;
}

/** Thin wrapper around shadcn Switch for settings toggles. */
export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className={className}
    />
  );
}
