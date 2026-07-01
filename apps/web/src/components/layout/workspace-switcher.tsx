import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateWorkspace,
  useSwitchWorkspace,
  useWorkspaces,
} from "@/modules/workspaces/hooks/use-workspaces";
import type { Workspace } from "@app/shared";
import { Icon } from "@benrobo/iconary/react";
import { ArrowUpDownIcon, LayoutGridIcon, Logout01Icon, PlusSignIcon, Tick02Icon } from "@benrobo/iconary/core/duotone-rounded";
import { initials } from "@/lib/format";

function WorkspaceAvatar({ name }: { name: string }) {
  return (
    <span className="band-iris flex size-7 shrink-0 items-center justify-center rounded-[9px] text-[12px] font-bold uppercase text-white shadow-chip">
      {initials(name).slice(0, 1)}
    </span>
  );
}

function truncateName(name: string, maxLen = 14) {
  return name.length <= maxLen ? name : `${name.slice(0, maxLen)}…`;
}

function displayName(user: { name: string | null; email: string }) {
  if (user.name?.trim()) return user.name;
  return user.email.split("@")[0] ?? "User";
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });
  const {
    workspaces,
    activeWorkspace,
    isLoading,
    isError,
    refetch,
  } = useWorkspaces();
  const switchWorkspace = useSwitchWorkspace();
  const createWorkspace = useCreateWorkspace();

  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const pending = switchWorkspace.isPending || createWorkspace.isPending;
  const userLabel = user ? displayName(user) : "Account";

  const handleSelect = (workspace: Workspace) => {
    if (workspace.id === activeWorkspace?.id) {
      setOpen(false);
      return;
    }
    switchWorkspace.mutate(workspace.id, {
      onSuccess: () => {
        toast.success(`Switched to ${workspace.name}`);
        setOpen(false);
      },
      onError: () => toast.error("Couldn't switch workspace. Try again."),
    });
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createWorkspace.mutate(name, {
      onSuccess: (workspace) => {
        toast.success(`Workspace "${workspace.name}" created`);
        setNewName("");
        setIsCreating(false);
        setOpen(false);
      },
      onError: () => toast.error("Couldn't create workspace. Try again."),
    });
  };

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      toast.error("Couldn't sign out cleanly.");
    }
    router.navigate({ to: "/auth" });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && isError) {
      refetch();
    }
    if (!next) {
      setIsCreating(false);
      setNewName("");
    }
  };

  return (
    <div className="flex w-full shrink-0 items-center gap-2 px-3.5 pb-1">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isLoading && !activeWorkspace}
            className="t-press flex min-w-0 flex-1 items-center gap-2.5 rounded-[12px] border border-hairline bg-inset px-2.5 py-2 text-left transition-colors hover:bg-iris-soft/40 disabled:opacity-60"
          >
            <WorkspaceAvatar name={activeWorkspace?.name ?? "W"} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
              {isLoading
                ? "Loading…"
                : activeWorkspace
                  ? truncateName(activeWorkspace.name)
                  : "Select workspace"}
            </span>
            <Icon icon={ArrowUpDownIcon} size={13} className="shrink-0 text-content-faint" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          className="w-[280px] rounded-[16px] border-hairline bg-card p-1.5 text-foreground shadow-card"
        >
          <div className="flex items-center gap-2 px-2.5 pb-2 pt-1.5">
            <Icon icon={LayoutGridIcon} size={13} className="text-content-faint" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-content-faint">
              Workspaces · {workspaces.length}
            </span>
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                Loading workspaces…
              </div>
            ) : isError ? (
              <div className="space-y-2 px-3 py-4 text-center">
                <p className="text-[13px] text-muted-foreground">
                  Couldn't load workspaces.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                No workspaces yet.
              </div>
            ) : (
              workspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspace?.id;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    disabled={pending}
                    onClick={() => handleSelect(workspace)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[11px] px-2.5 py-2 text-left transition-colors disabled:opacity-50",
                      isActive ? "bg-iris-soft" : "hover:bg-inset"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <WorkspaceAvatar name={workspace.name} />
                      <span className={cn("truncate text-[13px] font-semibold", isActive && "text-iris-deep")}>
                        {workspace.name}
                      </span>
                    </span>
                    {isActive ? (
                      <Icon icon={Tick02Icon} size={14} className="shrink-0 text-iris-deep" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-1 border-t border-hairline-soft pt-1.5">
            {isCreating ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-2 p-1">
                <Input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Workspace name"
                  autoFocus
                  disabled={pending}
                  className="h-9 rounded-lg text-sm"
                />
                <div className="flex gap-1.5">
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1"
                    disabled={!newName.trim() || pending}
                  >
                    {createWorkspace.isPending ? "Creating…" : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setIsCreating(false);
                      setNewName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-2 transition-colors hover:bg-inset disabled:opacity-50"
              >
                <span className="flex size-7 items-center justify-center rounded-[9px] border border-dashed border-hairline text-content-faint">
                  <Icon icon={PlusSignIcon} size={13} />
                </span>
                <span className="text-[13px] font-medium text-content-muted">Create workspace</span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" title={userLabel} className="t-press shrink-0 rounded-full">
            <Avatar name={userLabel} size="sm" tone="iris" className="rounded-full" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px] rounded-[14px]">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-foreground">{userLabel}</span>
            {user?.email ? <span className="text-[11.5px] font-normal text-content-faint">{user.email}</span> : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-deep focus:bg-rose-soft focus:text-rose-deep"
            onSelect={handleSignOut}
          >
            <Icon icon={Logout01Icon} size={15} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
