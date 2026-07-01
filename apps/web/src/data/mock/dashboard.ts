import type { HomeData } from "@/modules/dashboard/types";

export const homeData: HomeData = {
  savedAcrossJars: 4_400_000,
  activeJars: 2,
  collectingNow: 1_200_000,
  collectingTarget: 3_600_000,
  collectionsCount: 1,
  sentThisMonth: 500_000,
  transfersCount: 1,
  activeCollection: {
    slug: "saturday-football",
    title: "Saturday football pitch",
    perPerson: 300_000,
    due: "Friday",
    collected: 1_200_000,
    target: 3_600_000,
    paid: 4,
    members: 12,
  },
  jars: [
    { id: "rent", name: "Rent", saved: 4_400_000, target: 20_000_000 },
    { id: "laptop", name: "Laptop", saved: 0, target: 50_000_000 },
  ],
  activity: [
    {
      kind: "paid",
      text: "Opeyemi paid ₦3,000 to Saturday football",
      who: "Opeyemi",
      when: "just now",
      link: { to: "/app/collections/$slug", params: { slug: "saturday-football" } },
    },
    {
      kind: "sent",
      text: "You sent ₦5,000 to Tunde",
      who: "₦5,000",
      when: "32m ago",
      link: { to: "/app/sent" },
    },
    {
      kind: "saved",
      text: "You saved ₦2,000 to Rent jar",
      who: "₦2,000",
      when: "1h ago",
      link: { to: "/app/savings/$id", params: { id: "rent" } },
    },
  ],
};
