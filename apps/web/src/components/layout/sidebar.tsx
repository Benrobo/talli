import type { IconData } from "@app/icons";
import { Icon } from "@app/icons";
import { Logo } from "@/components/brand/logo";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import {
  Home01Icon,
  UserGroupIcon,
  MoneySavingJarIcon,
  MoneySend02Icon,
  Invoice01Icon,
  Link01Icon,
  Settings01Icon,
} from "@app/icons";

interface NavItem {
  to:
    | "/home"
    | "/collections"
    | "/savings"
    | "/sent"
    | "/receipts"
    | "/chats"
    | "/settings";
  label: string;
  icon: IconData;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { to: "/home", label: "Home", icon: Home01Icon, exact: true },
  { to: "/collections", label: "Collections", icon: UserGroupIcon },
  { to: "/savings", label: "Savings jars", icon: MoneySavingJarIcon },
  { to: "/sent", label: "Money sent", icon: MoneySend02Icon },
  { to: "/receipts", label: "Receipts", icon: Invoice01Icon },
  { to: "/chats", label: "Linked chats", icon: Link01Icon },
  { to: "/settings", label: "Settings", icon: Settings01Icon },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-[230px] shrink-0 flex-col bg-sidebar pb-3.5 text-sidebar-foreground">
      <WorkspaceSwitcher />

      <div className="px-3.5">
        <div className="px-2 pb-5 pt-4">
          <Logo />
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <SidebarNavLink
              key={item.to}
              to={item.to}
              activeOptions={item.exact ? { exact: true } : undefined}
            >
              <Icon data={item.icon} size={17} />
              {item.label}
            </SidebarNavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
