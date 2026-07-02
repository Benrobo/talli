/**
 * Types for the dashboard Home screen. All money values are integer minor
 * units (kobo); render them through the helpers in "@/lib/format".
 */

export type ActivityKind = "paid" | "sent" | "saved";

export type ActivityLink =
  | { to: "/app/collections/$slug"; params: { slug: string } }
  | { to: "/app/collections" }
  | { to: "/app/savings" }
  | { to: "/app/sent" }
  | { to: "/app/savings/$id"; params: { id: string } };

export interface ActiveCollection {
  slug: string;
  title: string;
  perPerson: number;
  due: string;
  collected: number;
  target: number;
  paid: number;
  members: number;
}

export interface HomeJar {
  id: string;
  name: string;
  saved: number;
  target: number;
}

export interface ActivityItem {
  kind: ActivityKind;
  text: string;
  who: string;
  when: string;
  link: ActivityLink;
}

export interface HomeData {
  savedAcrossJars: number;
  activeJars: number;
  collectingNow: number;
  collectingTarget: number;
  collectionsCount: number;
  sentThisMonth: number;
  transfersCount: number;
  activeCollection: ActiveCollection;
  jars: HomeJar[];
  activity: ActivityItem[];
}
