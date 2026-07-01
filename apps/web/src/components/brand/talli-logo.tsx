import { cn } from "@app/ui";

interface TalliLogoProps {
  className?: string;
  roundedCorners?: number;
  alt?: string;
}

export function TalliLogo({ className, roundedCorners = 5, alt = "Talli" }: TalliLogoProps) {
  return (
    <img
      src="/talli-logo.png"
      alt={alt}
      className={cn("h-10 w-auto object-contain", className)}
      style={{ borderRadius: roundedCorners }}
    />
  );
}
