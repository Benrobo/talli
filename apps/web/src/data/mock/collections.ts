import type { Collection } from "@/modules/collections/types";

export const collections: Collection[] = [
  {
    slug: "saturday-football",
    payReference: "TF-1024",
    title: "Saturday football pitch",
    purpose: "Weekly pitch rental",
    collectionType: "fixed_per_person",
    status: "live",
    perPersonMinor: 300_000,
    targetMinor: 3_600_000,
    collectedMinor: 1_200_000,
    paidCount: 4,
    memberCount: 12,
    due: "Friday, Jun 26",
    deadline: null,
    canEditAmounts: false,
    members: [
      { name: "Opeyemi", status: "paid", note: "paid 4:08 PM" },
      { name: "Benaiah", status: "paid", note: "paid 3:51 PM" },
      { name: "Ife", status: "paid", note: "paid 1:20 PM" },
      { name: "Sam", status: "paid", note: "paid 11:05 AM" },
      { name: "Tobi", status: "paying", note: "opening payment…" },
      { name: "Daniel", status: "unpaid", note: "not paid yet" },
      { name: "Mary", status: "unpaid", note: "not paid yet" },
    ],
  },
  {
    slug: "office-lunch-june",
    payReference: "TF-0990",
    title: "Office lunch — June",
    purpose: "",
    collectionType: "open_contribution",
    status: "closed",
    perPersonMinor: 0,
    targetMinor: 5_000_000,
    collectedMinor: 5_000_000,
    paidCount: 0,
    memberCount: 0,
    due: "",
    deadline: null,
    canEditAmounts: false,
    members: [],
  },
  {
    slug: "august-dues",
    payReference: "TF-1001",
    title: "August monthly dues",
    purpose: "",
    collectionType: "fixed_per_person",
    status: "draft",
    perPersonMinor: 500_000,
    targetMinor: 0,
    collectedMinor: 0,
    paidCount: 0,
    memberCount: 0,
    due: "",
    deadline: null,
    canEditAmounts: true,
    members: [],
  },
];

/** Look up a single collection by its slug. */
export function getCollection(slug: string): Collection | undefined {
  return collections.find((collection) => collection.slug === slug);
}
