export type CollectionStatus = "live" | "closed" | "draft";

export type CollectionType = "fixed_per_person" | "open_contribution" | "named_members";

export type MemberStatus = "paid" | "paying" | "unpaid";

export interface Member {
  name: string;
  status: MemberStatus;
  note?: string;
  paidAmount: number;
  contributionCount: number;
  platform: "telegram" | "whatsapp" | null;
  username: string | null;
}

export interface Collection {
  slug: string;
  payReference: string;
  title: string;
  purpose: string;
  collectionType: CollectionType;
  status: CollectionStatus;
  perPersonMinor: number;
  targetMinor: number;
  collectedMinor: number;
  withdrawnMinor: number;
  availableMinor: number;
  paidCount: number;
  memberCount: number;
  due: string;
  deadline: string | null;
  canEditAmounts: boolean;
  members: Member[];
}
