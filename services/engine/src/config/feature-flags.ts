import env from "./env.js";

export type FeatureFlag =
  | "auth"
  | "users"
  | "ai"
  | "media"
  | "notifications"
  | "socket"
  | "workspaces"
  | "telegram"
  | "whatsapp"
  | "collections"
  | "savings"
  | "nomba"
  | "bot_commands";

interface FeatureFlagConfig {
  enabled: boolean;
  label: string;
}

const DEFAULT_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  auth: { enabled: true, label: "Authentication" },
  users: { enabled: true, label: "User profiles" },
  ai: { enabled: true, label: "AI generation" },
  media: { enabled: false, label: "Media uploads" },
  notifications: { enabled: true, label: "Notifications" },
  socket: { enabled: false, label: "Realtime socket" },
  workspaces: { enabled: true, label: "Workspaces" },
  telegram: { enabled: true, label: "Telegram bot" },
  whatsapp: { enabled: true, label: "WhatsApp bot" },
  collections: { enabled: true, label: "Collections" },
  savings: { enabled: true, label: "Savings jars" },
  nomba: { enabled: true, label: "Nomba payments" },
  bot_commands: { enabled: true, label: "Bot command parser" },
};

function loadFlags(): Record<FeatureFlag, FeatureFlagConfig> {
  const flags = { ...DEFAULT_FLAGS };
  const override = env.FEATURE_FLAGS;
  if (!override) return flags;

  try {
    const parsed = JSON.parse(override) as Partial<Record<FeatureFlag, boolean>>;
    for (const [key, enabled] of Object.entries(parsed)) {
      if (key in flags && typeof enabled === "boolean") {
        flags[key as FeatureFlag] = { ...flags[key as FeatureFlag], enabled };
      }
    }
  } catch {
    console.error("[feature-flags] Failed to parse FEATURE_FLAGS env var");
  }

  return flags;
}

const flags = loadFlags();

/**
 * Check if a single feature is enabled. Cheap; safe to call inside hot paths.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return flags[flag]?.enabled ?? false;
}

/**
 * Returns the full flag map. Useful for an admin endpoint or marketing page.
 */
export function getFeatureFlags(): Record<FeatureFlag, FeatureFlagConfig> {
  return { ...flags };
}

export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(flags) as FeatureFlag[]).filter((k) => flags[k].enabled);
}

export function getDisabledFeatures(): FeatureFlag[] {
  return (Object.keys(flags) as FeatureFlag[]).filter((k) => !flags[k].enabled);
}
