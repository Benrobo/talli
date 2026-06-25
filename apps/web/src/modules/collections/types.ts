/**
 * Types for the Collections module. All money values are integer minor units
 * (kobo); render them through the helpers in "@/lib/format".
 */

export type CollectionStatus = "live" | "closed" | "draft";

export type MemberStatus = "paid" | "paying" | "unpaid";

export interface Member {
  name: string;
  status: MemberStatus;
  note?: string;
}

export interface Collection {
  slug: string;
  payReference: string;
  title: string;
  status: CollectionStatus;
  perPersonMinor: number;
  targetMinor: number;
  collectedMinor: number;
  paidCount: number;
  memberCount: number;
  due: string;
  members: Member[];
}
