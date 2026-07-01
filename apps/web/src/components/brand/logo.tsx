import { cn } from "@app/ui";

interface LogoMarkProps {
  size?: number;
  className?: string;
  slashClassName?: string;
}

export function LogoMark({ size = 18, className, slashClassName }: LogoMarkProps) {
  const bars = [0, 1, 2, 3];
  return (
    <span
      className={cn("relative inline-flex items-center gap-[2.5px]", className)}
      style={{ height: size }}
    >
      {bars.map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-[2px] bg-iris"
          style={{ height: size }}
        />
      ))}
      <span
        className={cn(
          "absolute left-[-3px] right-[-3px] top-1/2 h-[3px] -translate-y-1/2 -rotate-[22deg] rounded-[2px] bg-iris-deep",
          slashClassName
        )}
      />
    </span>
  );
}

interface LogoProps {
  className?: string;
  markSize?: number;
}

export function Logo({ className, markSize = 17 }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={markSize} />
      <span className="text-[19px] font-bold tracking-[-0.02em] text-foreground">Talli</span>
    </span>
  );
}
