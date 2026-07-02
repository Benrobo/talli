import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { CHAT_API } from "./chat.api";
import type {
  CreateLinkCodePayload,
  CreateLinkCodeResponse,
  DisconnectChatResponse,
  ListConnectedChatsResponse,
} from "./chat.types";

export const chatQueryKeys = {
  all: () => ["chat"] as const,
  connected: () => [...chatQueryKeys.all(), "connected"] as const,
};

export const useConnectedChats = () => {
  return useQuery<ListConnectedChatsResponse, AxiosError>({
    queryKey: chatQueryKeys.connected(),
    queryFn: CHAT_API.LIST_CONNECTED,
  });
};

export const useCreateLinkCode = () => {
  return useMutation<CreateLinkCodeResponse, AxiosError, CreateLinkCodePayload>({
    mutationFn: CHAT_API.CREATE_LINK_CODE,
  });
};

export const useDisconnectChat = () => {
  const queryClient = useQueryClient();

  return useMutation<DisconnectChatResponse, AxiosError, string>({
    mutationFn: CHAT_API.DISCONNECT,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.connected() });
    },
  });
};
