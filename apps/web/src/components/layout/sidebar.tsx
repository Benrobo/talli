import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import {
  Home01Icon,
  Invoice01Icon,
  Link01Icon,
  MoneySavingJarIcon,
  MoneySend02Icon,
  ReceiptDollarIcon,
  UserGroupIcon,
} from "@benrobo/iconary/core/duotone-rounded";

import { LogoMark } from "@/components/brand/logo";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { Spotlight } from "@/components/ui";

interface NavItem {
  to: "/app/home" | "/app/collections" | "/app/savings" | "/app/sent" | "/app/receipts" | "/app/split" | "/app/integrations";
  label: string;
  icon: IconData;
  exact?: boolean;
}

const MENU: NavItem[] = [
  { to: "/app/home", label: "Overview", icon: Home01Icon, exact: true },
  { to: "/app/collections", label: "Collections", icon: UserGroupIcon },
  { to: "/app/savings", label: "Savings jars", icon: MoneySavingJarIcon },
  { to: "/app/split", label: "Split a bill", icon: ReceiptDollarIcon },
  { to: "/app/sent", label: "Money sent", icon: MoneySend02Icon },
  { to: "/app/receipts", label: "Receipts", icon: Invoice01Icon },
];

const GENERAL: NavItem[] = [
  { to: "/app/integrations", label: "Integrations", icon: Link01Icon },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-content-faint">
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
    <aside className="flex h-full w-[248px] shrink-0 flex-col bg-card">
      <div className="flex items-center gap-2.5 px-5 py-[18px]">
        <span className="grad-chip flex size-9 items-center justify-center rounded-[11px] border border-hairline shadow-chip">
          <LogoMark size={15} />
        </span>
        <span className="font-display text-[18px] font-bold tracking-[-0.02em] text-foreground">Talli</span>
      </div>

      <WorkspaceSwitcher />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3.5 py-5">
        <NavGroup label="Main menu" items={MENU} />
        <NavGroup label="General" items={GENERAL} />
      </div>

      <div className="shrink-0 p-3.5">
        <Spotlight className="p-4">
          <div className="mb-1 text-[11.5px] font-medium text-white/70">Total balance</div>
          <div className="font-display tabular text-[24px] font-bold leading-none tracking-[-0.02em]">₦56,000</div>
          <div className="mt-1.5 text-[11px] text-white/65">across jars &amp; collections</div>
        </Spotlight>
      </div>
    </aside>
  );
}
