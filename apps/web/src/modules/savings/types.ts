export type JarStatus = "active" | "locked";

export interface Deposit {
  amountMinor: number;
  when: string;
}

export interface Jar {
  id: string;
  name: string;
  savedMinor: number;
  targetMinor: number;
  targetAmountMinor: number | null;
  lockUntil: string | null;
  status: JarStatus;
  lockText: string;
  canEditAmounts: boolean;
  deposits: Deposit[];
}

export interface SavingsSummary {
  totalSavedMinor: number;
  totalTargetMinor: number;
  jarCount: number;
  lockedCount: number;
}
