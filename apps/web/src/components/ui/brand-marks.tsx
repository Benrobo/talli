/**
 * Official brand roundels as inline SVG. Iconary's Telegram glyph is a bare paper
 * plane, not the recognizable circular logo — brand marks are their own thing, so
 * we render the real ones here (self-contained, CSP-safe). Each fills its box; set
 * a size via width/height or the wrapping element.
 */

export function TelegramMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="Telegram"
    >
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path
        d="M5.5 11.8 16.4 7.4c.5-.18.94.12.78.88l-1.86 8.76c-.13.6-.5.75-1 .47l-2.77-2.04-1.34 1.29c-.15.15-.27.27-.55.27l.2-2.8 5.1-4.6c.22-.2-.05-.31-.34-.11l-6.3 3.97-2.72-.85c-.59-.19-.6-.59.13-.87Z"
        fill="#fff"
      />
    </svg>
  );
}

export function WhatsappMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="WhatsApp"
    >
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        d="M12 6.2a5.8 5.8 0 0 0-4.96 8.8L6.2 17.8l2.86-.83A5.8 5.8 0 1 0 12 6.2Zm0 1.35a4.45 4.45 0 0 1 3.7 6.92l-.1.16.5 1.83-1.88-.49-.16.1A4.45 4.45 0 1 1 12 7.55Zm-2.03 2.2c-.1 0-.26.04-.4.19-.13.15-.52.5-.52 1.23 0 .72.53 1.42.6 1.52.08.1 1.04 1.66 2.58 2.26 1.28.5 1.54.4 1.82.38.28-.03.9-.37 1.02-.72.13-.36.13-.66.09-.72-.04-.06-.14-.1-.3-.18-.15-.08-.9-.44-1.03-.49-.14-.05-.24-.08-.34.08-.1.15-.39.48-.48.58-.09.1-.18.11-.33.04-.15-.08-.64-.24-1.22-.75-.45-.4-.75-.9-.84-1.05-.09-.15-.01-.24.07-.31.07-.07.15-.18.23-.27.07-.09.1-.15.15-.25.05-.1.02-.19-.01-.27-.04-.08-.34-.82-.46-1.12-.12-.29-.24-.25-.34-.25l-.29-.01Z"
        fill="#fff"
      />
    </svg>
  );
}
