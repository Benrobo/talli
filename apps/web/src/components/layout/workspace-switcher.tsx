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
  useCreateWorkspace,
  useSwitchWorkspace,
  useWorkspaces,
} from "@/modules/workspaces/hooks/use-workspaces";
import type { Workspace } from "@app/shared";
import { Icon } from "@benrobo/iconary/react";
import { ArrowUpDownIcon, LayoutGridIcon, PlusSignIcon, Tick02Icon } from "@benrobo/iconary/core/duotone-rounded";
import { initials } from "@/lib/format";

function WorkspaceAvatar({
  name,
  tone = "sidebar",
}: {
  name: string;
  tone?: "sidebar" | "popover";
}) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold uppercase",
        tone === "sidebar"
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "bg-primary text-primary-foreground"
      )}
    >
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
    <div className="flex w-full shrink-0 items-center gap-2 border-y border-hairline px-3.5 py-2.5">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isLoading && !activeWorkspace}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-hairline px-2.5 py-2 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
          >
            <WorkspaceAvatar name={activeWorkspace?.name ?? "W"} tone="popover" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
              {isLoading
                ? "Loading…"
                : activeWorkspace
                  ? truncateName(activeWorkspace.name)
                  : "Select workspace"}
            </span>
            <Icon icon={ArrowUpDownIcon} size={12} className="shrink-0 text-content-faint" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          className="w-[280px] border-sidebar-border bg-card text-foreground"
        >
          <div className="flex items-center gap-2 border-b border-hairline-soft px-3 py-2">
            <Icon icon={LayoutGridIcon} size={12} className="text-muted-foreground" />
            <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
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
                      "flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                      isActive ? "bg-accent" : "hover:bg-muted/50"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <WorkspaceAvatar name={workspace.name} tone="popover" />
                      <span className="truncate text-[13px] font-medium">
                        {workspace.name}
                      </span>
                    </span>
                    {isActive ? (
                      <Icon icon={Tick02Icon} size={13} className="shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-hairline-soft p-2">
            {isCreating ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-2">
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
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                <span className="flex size-4 items-center justify-center border border-hairline">
                  <Icon icon={PlusSignIcon} size={10} className="text-muted-foreground" />
                </span>
                <span className="text-[13px] text-muted-foreground">
                  Create workspace
                </span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        title={userLabel}
        onClick={() => router.navigate({ to: "/settings" })}
        className="shrink-0 transition-opacity hover:opacity-80"
      >
        <Avatar name={userLabel} size="sm" tone="iris" className="rounded-full" />
      </button>
    </div>
  );
}
