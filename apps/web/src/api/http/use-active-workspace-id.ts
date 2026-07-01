import { useQuery } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/workspaces";

/** Must match `queryKey` in `@/modules/workspaces/hooks/use-workspaces`. */
export const workspacesListQueryKey = ["workspaces"] as const;

export function workspaceScope(workspaceId?: string): string {
  return workspaceId ?? "none";
}

export function useActiveWorkspaceId(): string | undefined {
  const { data } = useQuery({
    queryKey: workspacesListQueryKey,
    queryFn: workspacesApi.list,
    staleTime: 60_000,
  });

  return data?.find((workspace) => workspace.isActive)?.id;
}
