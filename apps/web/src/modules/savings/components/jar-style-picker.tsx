import { motion } from "motion/react";
import { cn } from "@app/ui";
import { Icon } from "@benrobo/iconary/react";
import { Tick02Icon } from "@benrobo/iconary/core/solid-rounded";
import { JAR_COLORS, JAR_ICONS } from "@/modules/savings/jar-style";

interface JarStylePickerProps {
  icon: string;
  accentColor: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

const TAP = { scale: 0.86 } as const;
const SPRING = { type: "spring", stiffness: 520, damping: 18, mass: 0.5 } as const;

export function JarStylePicker({
  icon,
  accentColor,
  onIconChange,
  onColorChange,
}: JarStylePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="mb-2 block text-[12.5px] font-medium text-content-muted">Pick an icon</span>
        <div
          className="-mx-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 26px), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 26px), transparent 100%)",
          }}
        >
          <div className="grid w-max grid-flow-col grid-rows-2 gap-2 pr-6">
            {JAR_ICONS.map((option) => {
              const selected = option.key === icon;
              return (
                <motion.button
                  key={option.key}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  onClick={() => onIconChange(option.key)}
                  whileTap={TAP}
                  transition={SPRING}
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-[13px] border",
                    selected
                      ? "border-transparent text-white shadow-chip"
                      : "border-hairline bg-inset text-content-muted hover:text-foreground"
                  )}
                  style={selected ? { backgroundColor: accentColor } : undefined}
                >
                  <Icon icon={option.icon} size={20} />
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <span className="mb-2 block text-[12.5px] font-medium text-content-muted">Accent color</span>
        <div
          className="-mx-1 overflow-x-auto px-1 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 26px), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 26px), transparent 100%)",
          }}
        >
          <div className="flex w-max gap-2.5 pr-6">
            {JAR_COLORS.map((color) => {
              const selected = color.toLowerCase() === accentColor.toLowerCase();
              return (
                <motion.button
                  key={color}
                  type="button"
                  aria-label={`Accent ${color}`}
                  onClick={() => onColorChange(color)}
                  whileTap={TAP}
                  animate={{ scale: selected ? 1.08 : 1 }}
                  transition={SPRING}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: selected
                      ? `0 0 0 2px var(--color-card), 0 0 0 4px ${color}`
                      : undefined,
                  }}
                >
                  {selected ? <Icon icon={Tick02Icon} size={15} color="#fff" strokeWidth={3} /> : null}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
