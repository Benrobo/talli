import type { Jar, SavingsSummary } from "@/modules/savings/types";

export const jars: Jar[] = [
  {
    id: "rent",
    name: "Rent",
    savedMinor: 4_400_000,
    targetMinor: 20_000_000,
    targetAmountMinor: 20_000_000,
    lockUntil: "2026-07-30T00:00:00.000Z",
    status: "locked",
    lockText: "unlocks Jul 30",
    canEditAmounts: false,
    deposits: [
      { amountMinor: 200_000, when: "from chat · 1h ago" },
      { amountMinor: 2_000_000, when: "Jun 18" },
      { amountMinor: 2_200_000, when: "Jun 10" },
    ],
  },
  {
    id: "laptop",
    name: "Laptop",
    savedMinor: 0,
    targetMinor: 50_000_000,
    targetAmountMinor: 50_000_000,
    lockUntil: null,
    status: "active",
    lockText: "no lock",
    canEditAmounts: true,
    deposits: [],
  },
  {
    id: "emergency",
    name: "Emergency",
    savedMinor: 1_500_000,
    targetMinor: 10_000_000,
    targetAmountMinor: 10_000_000,
    lockUntil: null,
    status: "active",
    lockText: "no lock",
    canEditAmounts: false,
    deposits: [],
  },
];

/** Look up a single jar by its id. */
export function getJar(id: string): Jar | undefined {
  return jars.find((jar) => jar.id === id);
}

export const totalSavedMinor = jars.reduce((sum, jar) => sum + jar.savedMinor, 0);

/** Roll-up figures for the savings overview hero. */
export const savingsSummary: SavingsSummary = {
  totalSavedMinor,
  totalTargetMinor: jars.reduce((sum, jar) => sum + jar.targetMinor, 0),
  jarCount: jars.length,
  lockedCount: jars.filter((jar) => jar.status === "locked").length,
};
