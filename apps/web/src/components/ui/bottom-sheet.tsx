import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { cn } from "@/lib/utils";
import { Icon } from "@benrobo/iconary/react";
import { Cancel01Icon } from "@benrobo/iconary/core/duotone-rounded";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dragControls = useDragControls();
  const [dragging, setDragging] = useState(false);

  const finishDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragging(false);
    if (info.offset.y > 96 || info.velocity.y > 700) onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!sheetRef.current?.contains(event.target as Node)) onOpenChange(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePress);
    };
  }, [open, onOpenChange]);

  const portalTarget =
    document.querySelector<HTMLElement>("[data-bottom-sheet-root]") ?? document.body;
  const isContained = portalTarget !== document.body;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "pointer-events-none inset-x-0 bottom-0 z-50 flex justify-center px-0 sm:px-4",
            isContained ? "absolute" : "fixed"
          )}
        >
          <motion.section
            ref={sheetRef}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            initial={{ height: 0, y: 24 }}
            animate={{ height: "auto", y: 0 }}
            exit={{ height: 0, y: 24 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.65 }}
            dragMomentum={false}
            dragTransition={{ bounceStiffness: 520, bounceDamping: 38 }}
            onDragStart={() => setDragging(true)}
            onDragEnd={finishDrag}
            transition={{
              y: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
              height: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
            }}
            className={cn(
              "pointer-events-auto relative h-auto max-h-[calc(100dvh-1rem)] w-dvw! max-w-none! overflow-y-auto rounded-t-[22px] border border-b-0 border-hairline bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-30px_90px_-34px_rgba(109,74,230,0.32),0_-10px_32px_-18px_rgba(124,91,240,0.22)] sm:w-full! sm:max-w-[500px]! sm:p-5",
              dragging && "select-none",
              className
            )}
          >
            <h2 id={titleId} className="sr-only pointer-events-none!">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="sr-only pointer-events-none!">
                {description}
              </p>
            ) : null}
            <div
              aria-hidden
              onPointerDown={(event) => {
                document.getSelection()?.removeAllRanges();
                dragControls.start(event);
              }}
              className="mx-auto -mt-2 mb-1 flex h-8 w-24 touch-none select-none cursor-grab items-center justify-center active:cursor-grabbing"
            >
              <span className="h-1.5 w-11 rounded-full bg-track" />
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="t-press absolute right-3.5 top-3.5 flex size-8 items-center justify-center rounded-full text-content-muted hover:bg-inset hover:text-foreground"
            >
              <Icon icon={Cancel01Icon} size={16} />
            </button>
            {children}
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>,
    portalTarget
  );
}
