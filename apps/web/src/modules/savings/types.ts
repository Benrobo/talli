/**
 * Types for the Savings jars screens. All money values are integer minor
 * units (kobo); render them through the helpers in "@/lib/format".
 */

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
  status: JarStatus;
  lockText: string;
  deposits: Deposit[];
}
