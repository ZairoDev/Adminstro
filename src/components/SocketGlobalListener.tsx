 "use client";

 import { useEffect } from "react";
 import { useSocket } from "@/hooks/useSocket";
 import { useAuthStore } from "@/AuthStore";
 import axios from "axios";
 import { useRouter } from "next/navigation";

 export default function SocketGlobalListener() {
   const { socket } = useSocket();
   const { clearToken, token } = useAuthStore();
   const router = useRouter();

   useEffect(() => {
     if (!socket) return;

     const getCookie = (name: string) => {
       const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
       return match ? match[2] : null;
     };

     const registerSocket = () => {
       try {
         const sessionId = getCookie("sessionId");
        if (token?.id) {
         // Debug: log register attempt
         try {
           console.log("[SOCKET-DBG] emitting register-user", { employeeId: token.id, sessionId });
         } catch {}
         socket.emit("register-user", { employeeId: token.id, sessionId });
        }
       } catch (err) {
        console.warn("Socket registration failed:", err);
       }
     };

    // Debug: log socket presence
    try {
      console.log("[SOCKET-DBG] socket present", { id: (socket as any).id, connected: (socket as any).connected });
    } catch {}

    // Register but wait for connection if socket isn't ready yet.
    const doRegister = () => {
      try {
        const sessionId = getCookie("sessionId");
        try {
          console.log("[SOCKET-DBG] emitting register-user", { employeeId: token?.id, sessionId });
        } catch {}
        socket.emit("register-user", { employeeId: token?.id, sessionId });
      } catch (err) {
        console.warn("Socket registration failed:", err);
      }
    };

    if ((socket as any).connected) {
      doRegister();
    } else {
      socket.once("connect", () => {
        try {
          console.log("[SOCKET-DBG] socket connected (once)", { id: (socket as any).id });
        } catch {}
        doRegister();
      });
      socket.on("connect_error", (err: any) => {
        try {
          console.warn("[SOCKET-DBG] connect_error", err);
        } catch {}
      });
    }

     const handleForceLogout = async (data: { _id?: string; sessionId?: string }) => {
      try {
        if (!token?.id) return;
        if (data?._id && data._id !== token.id) return;
        // Server already marked the session as ended. Client should only clear local state and redirect.
      } catch (err) {
        console.warn("Auto logout handler error:", err);
      } finally {
        clearToken();
        router.push("/login");
      }
     };

     socket.on("force-logout", handleForceLogout);

     return () => {
       socket.off("force-logout", handleForceLogout);
      socket.off("connect");
      socket.off("connect_error");
     };
   }, [socket, token, clearToken, router]);

   return null;
 }

