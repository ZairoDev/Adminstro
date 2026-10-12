"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";

type RoomsSnapshot = {
  phoneIds: string[];
  channelIds: string[];
  currentUserId: string | undefined;
  retargetPhoneId: string | null;
};

/**
 * Base whatsapp-room + user-{id} subscription.
 * Used on dashboard (bell) where full scoped rooms are not needed.
 * On /whatsapp, use useWhatsAppSocketRooms instead (full owner).
 */
export function useWhatsAppBaseRoom(
  socket: Socket | null,
  currentUserId: string | undefined,
): void {
  const userIdRef = useRef(currentUserId?.toString());
  userIdRef.current = currentUserId?.toString();

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const joinBaseRoom = () => {
      const userId = userIdRef.current;
      if (!userId) return;
      socket.emit("join-whatsapp-room", userId);
    };

    joinBaseRoom();
    socket.on("connect", joinBaseRoom);

    return () => {
      socket.off("connect", joinBaseRoom);
      socket.emit("leave-whatsapp-room");
    };
  }, [socket, currentUserId]);
}

/**
 * Sole owner of WhatsApp socket room membership on the /whatsapp route.
 *
 * Split into two effects so phone-config load (roomKey change) only
 * re-subscribes phone/channel rooms — never leave/rejoin the base room.
 */
export function useWhatsAppSocketRooms(
  socket: Socket | null,
  currentUserId: string | undefined,
  retargetPhoneId: string | null,
  roomKey: string,
  phoneIds: string[],
  channelIds: string[],
  phoneConfigsReady: boolean,
): void {
  const roomsRef = useRef<RoomsSnapshot>({
    phoneIds,
    channelIds,
    currentUserId: currentUserId?.toString(),
    retargetPhoneId,
  });
  roomsRef.current = {
    phoneIds,
    channelIds,
    currentUserId: currentUserId?.toString(),
    retargetPhoneId,
  };

  // ── Base room: whatsapp-room + user-{id} ─────────────────────────────────
  // joinedBaseUserRef persists across React Strict Mode's cleanup/re-run cycle so
  // the base room is joined exactly once per (socket, userId) pair. The guard is
  // only reset when the socket or userId genuinely changes (deps array change).
  const joinedBaseUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const userId = currentUserId;

    const joinBaseRoom = (force = false) => {
      const currentId = roomsRef.current.currentUserId;
      if (!currentId) return;
      if (!force && joinedBaseUserRef.current === currentId) return;
      joinedBaseUserRef.current = currentId;
      socket.emit("join-whatsapp-room", currentId);
    };

    // Always join on the first run for this (socket, userId) pair.
    // If already joined (Strict Mode re-run), the guard skips the redundant emit.
    joinBaseRoom();
    const onReconnect = () => joinBaseRoom(true);
    socket.on("connect", onReconnect);

    return () => {
      socket.off("connect", onReconnect);
      // Reset so re-joining works when socket or userId genuinely changes.
      if (joinedBaseUserRef.current === userId) {
        joinedBaseUserRef.current = null;
      }
      socket.emit("leave-whatsapp-room");
    };
  }, [socket, currentUserId]);

  // ── Scoped rooms: phone, channel, retarget ───────────────────────────────
  // Waits for phone-config query so we join once with the final membership.
  useEffect(() => {
    if (!socket || !currentUserId || !phoneConfigsReady) return;

    const subscribedPhoneIds = phoneIds;
    const subscribedChannelIds = channelIds;
    const subscribedRetargetPhoneId = retargetPhoneId;

    const joinScopedRooms = () => {
      const rooms = roomsRef.current;
      if (rooms.retargetPhoneId) {
        socket.emit("join-whatsapp-retarget", rooms.retargetPhoneId);
      }
      for (const id of rooms.phoneIds) {
        if (id) socket.emit("join-whatsapp-phone", id);
      }
      for (const id of rooms.channelIds) {
        if (id) socket.emit("join-whatsapp-channel", id);
      }
    };

    joinScopedRooms();
    socket.on("connect", joinScopedRooms);

    return () => {
      socket.off("connect", joinScopedRooms);
      if (subscribedRetargetPhoneId) {
        socket.emit("leave-whatsapp-retarget", subscribedRetargetPhoneId);
      }
      for (const id of subscribedPhoneIds) {
        if (id) socket.emit("leave-whatsapp-phone", id);
      }
      for (const id of subscribedChannelIds) {
        if (id) socket.emit("leave-whatsapp-channel", id);
      }
    };
  }, [socket, currentUserId, retargetPhoneId, roomKey, phoneConfigsReady]);
}

/** Join the active conversation room for targeted session_updated events. */
export function useWhatsAppConversationRoom(
  socket: Socket | null,
  conversationId: string | null | undefined,
): void {
  const joinedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const id = String(conversationId);
    if (joinedIdRef.current && joinedIdRef.current !== id) {
      socket.emit("leave-conversation", joinedIdRef.current);
    }
    joinedIdRef.current = id;
    socket.emit("join-conversation", id);

    const onReconnect = () => {
      socket.emit("join-conversation", id);
    };
    socket.on("connect", onReconnect);

    return () => {
      socket.off("connect", onReconnect);
      socket.emit("leave-conversation", id);
      if (joinedIdRef.current === id) {
        joinedIdRef.current = null;
      }
    };
  }, [socket, conversationId]);
}
