import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@app/ui";
import { Button, Card, Input } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { AlertCircleIcon, Cancel01Icon, ImageAdd01Icon, Invoice01Icon, SparklesIcon } from "@benrobo/iconary/core/duotone-rounded";
import { billSplitApi } from "../api";

const MAX_BYTES = 8 * 1024 * 1024;

type Phase = "idle" | "ready" | "processing";

export function BillUploadWidget() {
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

  const onDrop = useCallback((accepted: File[], rejections: FileRejection[]) => {
    setError(null);
    if (rejections.length > 0) {
      const code = rejections[0].errors[0]?.code;
      setError(
        code === "file-too-large"
          ? "That image is over 8MB — try a smaller photo."
          : "That file isn't a supported image."
      );
      return;
    }
    const next = accepted[0];
    if (!next) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setFile(next);
    setPreview(url);
    setPhase("ready");
  }, []);

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
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8 text-center">
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
          <Icon icon={Invoice01Icon} size={24} />
        </span>
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">Split a bill</h1>
        <p className="mt-2 text-[14px] text-content-muted">
          Snap the receipt — everyone picks what they had and pays for it.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-2xl bg-card px-6 py-14 text-center outline-dashed outline-2 outline-offset-[-2px] outline-hairline transition-colors",
                isDragActive && "bg-iris-soft outline-iris",
                isDragReject && "bg-destructive/5 outline-destructive"
              )}
            >
              <input {...getInputProps()} />
              <motion.span
                animate={{ y: isDragActive ? -6 : 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "mb-4 flex size-14 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep transition-colors",
                  isDragActive && "bg-iris text-white"
                )}
              >
                <Icon icon={ImageAdd01Icon} size={26} />
              </motion.span>
              <div className="text-[15px] font-medium">
                {isDragActive ? "Drop the receipt" : "Drag a receipt here"}
              </div>
              <div className="mt-1 text-[13px] text-content-muted">or tap to choose a photo · max 8MB</div>
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
        <Button block size="lg" className="mt-5" disabled={phase === "processing"} onClick={createSplit}>
          {phase === "processing" ? "Setting up the split…" : "Create the split"}
        </Button>
      ) : null}
    </div>
  );
}
