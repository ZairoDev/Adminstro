"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

export const useSocket = (): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ✅ 1. Automatically pick correct backend based on environment
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://yourdomain.com" // 🔁 Replace with your VPS domain
        : "http://localhost:3000");

    console.log("🔗 Connecting to Socket:", socketUrl);

    // ✅ 2. Initialize connection
    const socket = io(socketUrl, {
      transports: ["websocket"], // Force WebSocket for better performance
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true, // Allow cookies/session if needed
    });

    socketRef.current = socket;

    // ✅ 3. Connection handlers
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("⚠️ Socket connection error:", error.message);
      setIsConnected(false);
    });

    // ✅ 4. Cleanup when component unmounts
    return () => {
      console.log("🧹 Cleaning up socket listeners");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, isConnected };
};
