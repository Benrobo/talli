import type { IconData } from "@benrobo/iconary/core";
import {
  Home01Icon,
  Invoice01Icon,
  Link01Icon,
  MoneySavingJarIcon,
  ReceiptDollarIcon,
  UserGroupIcon,
} from "@benrobo/iconary/core/duotone-rounded";

export interface AppNavItem {
  to:
    | "/app/home"
    | "/app/collections"
    | "/app/savings"
    | "/app/transactions"
    | "/app/split"
    | "/app/integrations";
  label: string;
  mobileLabel: string;
  icon: IconData;
  exact?: boolean;
}

export const PRIMARY_NAV: AppNavItem[] = [
  { to: "/app/home", label: "Overview", mobileLabel: "Home", icon: Home01Icon, exact: true },
  {
    to: "/app/collections",
    label: "Collections",
    mobileLabel: "Collect",
    icon: UserGroupIcon,
  },
  {
    to: "/app/savings",
    label: "Savings jars",
    mobileLabel: "Savings",
    icon: MoneySavingJarIcon,
  },
  {
    to: "/app/split",
    label: "Split a bill",
    mobileLabel: "Split",
    icon: ReceiptDollarIcon,
  },
  {
    to: "/app/transactions",
    label: "Transactions",
    mobileLabel: "History",
    icon: Invoice01Icon,
  },
];

export const GENERAL_NAV: AppNavItem[] = [
  {
    to: "/app/integrations",
    label: "Integrations",
    mobileLabel: "Connect",
    icon: Link01Icon,
  },
];

export const APP_NAV = [...PRIMARY_NAV, ...GENERAL_NAV];
export const MOBILE_NAV = PRIMARY_NAV.slice(0, 3);
export const MOBILE_MORE_NAV = [...PRIMARY_NAV.slice(3), ...GENERAL_NAV];
