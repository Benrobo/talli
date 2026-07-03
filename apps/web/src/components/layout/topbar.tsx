import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@benrobo/iconary/react";
import { Logout01Icon, UserIcon } from "@benrobo/iconary/core/duotone-rounded";
import { LogoMark } from "@/components/brand/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  UserAvatar,
} from "@/components/ui";
import { useMe, useLogout } from "@/api/http/v1/auth/auth.hooks";
import { EditProfileDialog } from "@/components/layout/edit-profile-dialog";
import { APP_NAV } from "./navigation";
import { TopbarNavLink } from "./topbar-nav-link";

export function Topbar() {
  const { data: meResponse } = useMe();
  const logout = useLogout();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRequested = useRef(false);
  const me = meResponse?.data.user;
  const avatarSeed = me?.email || me?.name;

  return (
    <header className="sticky top-0 flex h-16 shrink-0 items-center gap-4 border-b border-hairline bg-card/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Link to="/app/home" className="flex shrink-0 items-center gap-2.5">
        <span className="grad-chip flex size-9 items-center justify-center rounded-[11px] border border-hairline shadow-chip">
          <LogoMark size={15} />
        </span>
        <span className="hidden font-display text-[18px] font-bold tracking-[-0.02em] text-foreground sm:block">
          Talli
        </span>
      </Link>

      <nav className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex">
        {APP_NAV.map((item) => (
          <TopbarNavLink key={item.to} to={item.to} activeOptions={item.exact ? { exact: true } : undefined}>
            <Icon icon={item.icon} size={16} />
            {item.label}
          </TopbarNavLink>
        ))}
      </nav>

      <div className="flex flex-1 items-center justify-end lg:flex-none">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="t-press rounded-full transition-transform hover:scale-105"
            >
              <UserAvatar seed={avatarSeed} size={36} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56"
            onCloseAutoFocus={(event) => {
              if (!profileRequested.current) return;
              event.preventDefault();
              profileRequested.current = false;
              requestAnimationFrame(() => setProfileOpen(true));
            }}
          >
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5">
                <UserAvatar seed={avatarSeed} size={36} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {me?.name ?? "Talli user"}
                  </div>
                  <div className="truncate text-[11.5px] font-normal text-content-faint">{me?.email}</div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                profileRequested.current = true;
              }}
            >
              <Icon icon={UserIcon} size={15} />
              Edit profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => logout.mutate()}
              className="text-rose-deep focus:text-rose-deep"
            >
              <Icon icon={Logout01Icon} size={15} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <EditProfileDialog open={profileOpen} onOpenChange={setProfileOpen} user={me} />
      </div>
    </header>
  );
}
