import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@app/ui";
import { Button, Card, Input } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  AlertCircleIcon,
  Cancel01Icon,
  ImageAdd01Icon,
  Invoice01Icon,
  SparklesIcon,
  TickDouble02Icon,
  UserGroupIcon,
} from "@benrobo/iconary/core/duotone-rounded";
import { billSplitApi } from "../api";

const MAX_BYTES = 8 * 1024 * 1024;

type Phase = "idle" | "ready" | "processing";

export function BillUploadWidget({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const acceptFile = useCallback((next: File) => {
    if (!next.type.startsWith("image/")) {
      setError("That file isn't a supported image.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("That image is over 8MB — try a smaller photo.");
      return;
    }
    setError(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setFile(next);
    setPreview(url);
    setPhase("ready");
  }, []);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const code = rejections[0].errors[0]?.code;
        setError(
          code === "file-too-large"
            ? "That image is over 8MB — try a smaller photo."
            : "That file isn't a supported image."
        );
        return;
      }
      if (accepted[0]) acceptFile(accepted[0]);
    },
    [acceptFile]
  );

  useEffect(() => {
    if (phase === "processing") return;
    const onPaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith("image/")
      );
      if (!image) return;
      const file = image.getAsFile();
      if (!file) return;
      event.preventDefault();
      acceptFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [acceptFile, phase]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxSize: MAX_BYTES,
    multiple: false,
    disabled: phase === "processing",
  });

  function reset() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setFile(null);
    setPreview(null);
    setPhase("idle");
    setError(null);
  }

  async function createSplit() {
    if (!file) return;
    setPhase("processing");
    setError(null);
    try {
      const { token } = await billSplitApi.createFromImage(file, title.trim() || undefined);
      navigate({ to: "/bill/$token", params: { token } });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Couldn't read that bill. Try a clearer photo.";
      setError(message);
      setPhase("ready");
    }
  }

  return (
    <div className={compact ? "w-full" : "mx-auto w-full max-w-lg"}>
      {compact ? (
        <div className="mb-4">
          <h2 className="font-display text-[18px] font-bold tracking-[-0.02em] text-foreground">Split a bill</h2>
          <p className="mt-0.5 text-[13px] text-content-muted">
            Snap the receipt — everyone pays for what they had.
          </p>
        </div>
      ) : (
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
            <Icon icon={Invoice01Icon} size={24} />
          </span>
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">Split a bill</h1>
          <p className="mt-2 text-[14px] text-content-muted">
            Snap the receipt — everyone picks what they had and pays for it.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              {...getRootProps()}
              className={cn(
                "group flex cursor-pointer flex-col items-center justify-center rounded-2xl text-center outline-dashed outline-2 outline-offset-[-2px] outline-hairline transition-colors hover:bg-iris-soft/45 hover:outline-iris/30",
                compact ? "min-h-[292px] bg-inset px-5 py-8" : "bg-card px-6 py-14",
                isDragActive && "bg-iris-soft outline-iris",
                isDragReject && "bg-destructive/5 outline-destructive"
              )}
            >
              <input {...getInputProps()} />
              <motion.span
                animate={{ y: isDragActive ? -6 : 0, scale: isDragActive ? 1.06 : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className={cn(
                  "mb-4 flex size-14 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep shadow-soft transition-colors",
                  isDragActive && "bg-iris text-white"
                )}
              >
                <Icon icon={ImageAdd01Icon} size={26} />
              </motion.span>
              <div className="text-[15px] font-medium">
                {isDragActive ? "Drop the receipt" : "Drag a receipt here"}
              </div>
              <div className="mt-1 text-[13px] text-content-muted">
                Tap to choose, drag, or paste · max 8MB
              </div>
              {/* {compact ? (
                <div className="mt-6 grid w-full grid-cols-3 gap-2 border-t border-hairline pt-5">
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-card text-iris-deep shadow-soft">
                      <Icon icon={SparklesIcon} size={15} />
                    </span>
                    <span className="text-[10.5px] font-medium leading-[1.25] text-content-muted">
                      Receipt becomes items
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-emerald-soft text-emerald-deep shadow-soft">
                      <Icon icon={UserGroupIcon} size={15} />
                    </span>
                    <span className="text-[10.5px] font-medium leading-[1.25] text-content-muted">
                      Everyone picks theirs
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-amber-soft text-amber-deep shadow-soft">
                      <Icon icon={TickDouble02Icon} size={15} />
                    </span>
                    <span className="text-[10.5px] font-medium leading-[1.25] text-content-muted">
                      Payments stay tracked
                    </span>
                  </div>
                </div>
              ) : null} */}
            </div>
          </motion.div>
        ) : (
          <motion.div key="preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="overflow-hidden p-0">
              <div className="relative">
                <img src={preview} alt="Bill preview" className="max-h-[340px] w-full object-cover" />
                {phase !== "processing" ? (
                  <button
                    onClick={reset}
                    className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
                  >
                    <Icon icon={Cancel01Icon} size={15} />
                  </button>
                ) : null}
                <AnimatePresence>
                  {phase === "processing" ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 backdrop-blur-[2px]"
                    >
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="size-8 rounded-full border-[3px] border-white/30 border-t-white"
                      />
                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-white">
                        <Icon icon={SparklesIcon} size={14} />
                        Reading your bill…
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </Card>

            <div className="mt-4">
              <Input
                placeholder="Name this split (optional) — e.g. Dinner at Bukka"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={phase === "processing"}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/5 px-3.5 py-3 text-[13px] text-destructive"
          >
            <Icon icon={AlertCircleIcon} size={15} />
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {preview ? (
        <Button block size="lg" className="mt-5" loading={phase === "processing"} onClick={createSplit}>
          Create the split
        </Button>
      ) : null}
    </div>
  );
}
