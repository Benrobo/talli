import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import {
  Home01Icon,
  Invoice01Icon,
  Link01Icon,
  MoneySavingJarIcon,
  MoneySend02Icon,
  Settings01Icon,
  UserGroupIcon,
} from "@benrobo/iconary/core/duotone-rounded";

import { Logo } from "@/components/brand/logo";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

interface NavItem {
  to: "/home" | "/collections" | "/savings" | "/sent" | "/receipts" | "/chats" | "/settings";
  label: string;
  icon: IconData;
  exact?: boolean;
}

const MENU: NavItem[] = [
  { to: "/home", label: "Overview", icon: Home01Icon, exact: true },
  { to: "/collections", label: "Collections", icon: UserGroupIcon },
  { to: "/savings", label: "Savings jars", icon: MoneySavingJarIcon },
  { to: "/sent", label: "Money sent", icon: MoneySend02Icon },
  { to: "/receipts", label: "Receipts", icon: Invoice01Icon },
];

const GENERAL: NavItem[] = [
  { to: "/chats", label: "Integrations", icon: Link01Icon },
  { to: "/settings", label: "Settings", icon: Settings01Icon },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-content-faint">
        {label}
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <SidebarNavLink key={item.to} to={item.to} activeOptions={item.exact ? { exact: true } : undefined}>
            <Icon icon={item.icon} size={18} />
            {item.label}
          </SidebarNavLink>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col border-r border-hairline bg-card">
      <div className="flex items-center px-5 py-[18px]">
        <Logo />
      </div>

      <WorkspaceSwitcher />

      <div className="flex flex-1 flex-col gap-6 px-3.5 py-5">
        <NavGroup label="Main menu" items={MENU} />
        <NavGroup label="General" items={GENERAL} />
      </div>

      <div className="mx-3.5 mb-4 rounded-[14px] bg-night p-4 text-white">
        <div className="mb-1 text-[11.5px] text-on-night">Total balance</div>
        <div className="tabular text-[22px] font-bold leading-none">₦56,000</div>
        <div className="mt-1.5 text-[11px] text-on-night-soft">across jars & collections</div>
      </div>
    </aside>
  );
}
