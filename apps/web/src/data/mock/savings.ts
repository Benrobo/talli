import type { Jar, SavingsSummary } from "@/modules/savings/types";

export const jars: Jar[] = [
  {
    id: "rent",
    name: "Rent",
    savedMinor: 4_400_000,
    targetMinor: 20_000_000,
    status: "locked",
    lockText: "unlocks Jul 30",
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
    status: "active",
    lockText: "no lock",
    deposits: [],
  },
  {
    id: "emergency",
    name: "Emergency",
    savedMinor: 1_500_000,
    targetMinor: 10_000_000,
    status: "active",
    lockText: "no lock",
    deposits: [],
  },
];

/** Look up a single jar by its id. */
export function getJar(id: string): Jar | undefined {
  return jars.find((jar) => jar.id === id);
}

/** Total saved across every jar, in minor units. */
export const totalSavedMinor = jars.reduce((sum, jar) => sum + jar.savedMinor, 0);

/** Roll-up figures for the savings overview hero. */
export const savingsSummary: SavingsSummary = {
  totalSavedMinor,
  totalTargetMinor: jars.reduce((sum, jar) => sum + jar.targetMinor, 0),
  jarCount: jars.length,
  lockedCount: jars.filter((jar) => jar.status === "locked").length,
};
