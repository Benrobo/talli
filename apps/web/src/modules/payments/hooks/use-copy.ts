import { useState } from "react";

export function useCopy(resetMs = 1600) {
  const [copied, setCopied] = useState(false);

  function copy(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    });
  }

  return { copied, copy };
}
