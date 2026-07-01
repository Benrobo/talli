/**
 * Types for the Transfers module. All money values are integer minor units
 * (kobo); render them through the helpers in "@/lib/format".
 */

export interface Transfer {
  id: string;
  recipient: string;
  meta: string;
  typed: string;
  date: string;
  amountMinor: number;
}

export interface TransfersSummary {
  sentThisMonthMinor: number;
  monthLabel: string;
  transferCount: number;
  recipientCount: number;
}
