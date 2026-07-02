export type FeatureId =
  | "ai.command.parse"
  | "ai.text.default"
  | "ai.bill.parse"
  | "ai.agent";

export const FEATURE_IDS: FeatureId[] = ["ai.command.parse", "ai.text.default", "ai.agent"];
