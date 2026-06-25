import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { workspacesApi } from "@/lib/workspaces";

export function useWorkspaces() {
  const query = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
    staleTime: 60_000,
  });

  const activeWorkspace = query.data?.find((workspace) => workspace.isActive);

  return {
    ...query,
    workspaces: query.data ?? [],
    activeWorkspace,
    isOwner: activeWorkspace?.isOwner ?? false,
  };
}

export function useSwitchWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (workspaceId: string) => workspacesApi.switch(workspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await router.invalidate();
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (name: string) => workspacesApi.create({ name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await router.invalidate();
    },
  });
}
