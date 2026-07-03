export { cn } from "@app/ui";

export const shortenText = (text: string, maxLength: number = 10) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
  }).catch(() => {
    console.error("Failed to copy to clipboard");
  });
};