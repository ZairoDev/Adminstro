"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

// ============================================
// Singleton Socket Manager (outside React)    
// ============================================
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private isConnected = false;
  private subscribers = new Set<() => void>();
  private initialized = false;

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  initialize() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://adminstro.in"
        : "http://localhost:3000");

    console.log("🔗 Connecting to Socket:", socketUrl);

    this.socket = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket?.id);
      this.isConnected = true;
      this.notifySubscribers();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      this.isConnected = false;
      this.notifySubscribers();
    });

    this.socket.on("connect_error", (error) => {
      console.error("⚠️ Socket connection error:", error.message);
      this.isConnected = false;
      this.notifySubscribers();
    });

    this.socket.io.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
    });
  }

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback());
  }

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getSnapshot() {
    return { socket: this.socket, isConnected: this.isConnected };
  }

  getSocket() {
    return this.socket;
  }

  getIsConnected() {
    return this.isConnected;
  }
}

// Get the singleton instance
const socketManager = SocketManager.getInstance();

export const useSocket = (): UseSocketReturn => {
  // Initialize socket on first use
  useEffect(() => {
    socketManager.initialize();
  }, []);

  // Subscribe to socket state changes
  const [state, setState] = useState(() => socketManager.getSnapshot());

  useEffect(() => {
    // Update state immediately
    setState(socketManager.getSnapshot());

    // Subscribe to future changes
    const unsubscribe = socketManager.subscribe(() => {
      setState(socketManager.getSnapshot());
    });

    return unsubscribe;
  }, []);

  return state;
};
