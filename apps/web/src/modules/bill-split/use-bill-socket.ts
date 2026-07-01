import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import env from "@/config/env";
import type { ItemsClaimedEvent } from "./api";

export function useBillSocket(token: string, onClaimed: (event: ItemsClaimedEvent) => void) {
  const handlerRef = useRef(onClaimed);
  handlerRef.current = onClaimed;

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(env.SOCKET_URL, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => socket.emit("join-bill", token));
    socket.on("items.claimed", (event: ItemsClaimedEvent) => handlerRef.current(event));

    return () => {
      socket.disconnect();
    };
  }, [token]);
}
