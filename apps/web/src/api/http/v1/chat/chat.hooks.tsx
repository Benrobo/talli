import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useActiveWorkspaceId, workspaceScope } from "@/api/http/use-active-workspace-id";
import { CHAT_API } from "./chat.api";
import type {
  CreateLinkCodePayload,
  CreateLinkCodeResponse,
  DisconnectChatResponse,
  ListConnectedChatsResponse,
} from "./chat.types";

export const chatQueryKeys = {
  all: (workspaceId?: string) => ["chat", workspaceScope(workspaceId)] as const,
  connected: (workspaceId?: string) => [...chatQueryKeys.all(workspaceId), "connected"] as const,
};

export const useConnectedChats = () => {
  const workspaceId = useActiveWorkspaceId();

  return useQuery<ListConnectedChatsResponse, AxiosError>({
    queryKey: chatQueryKeys.connected(workspaceId),
    queryFn: CHAT_API.LIST_CONNECTED,
    enabled: !!workspaceId,
  });
};

export const useCreateLinkCode = () => {
  return useMutation<CreateLinkCodeResponse, AxiosError, CreateLinkCodePayload>({
    mutationFn: CHAT_API.CREATE_LINK_CODE,
  });
};

export const useDisconnectChat = () => {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  return useMutation<DisconnectChatResponse, AxiosError, string>({
    mutationFn: CHAT_API.DISCONNECT,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.connected(workspaceId) });
    },
  });
};
