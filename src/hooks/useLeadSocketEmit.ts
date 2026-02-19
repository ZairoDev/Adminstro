"use client";

import { useCallback } from "react";
import { useSocket } from "./useSocket";
import { IQuery } from "@/util/type";

/**
 * Hook that provides functions to emit lead events through the client's
 * socket connection. The socket server (socket.ts) handles rebroadcasting
 * to all relevant rooms.
 *
 * This replaces the broken `(global as any).io` approach in API routes,
 * which failed because Next.js API routes can run in a different execution
 * context from the custom socket server.
 */
export const useLeadSocketEmit = () => {
  const { socket, isConnected } = useSocket();

  const emitNewLead = useCallback(
    (lead: IQuery) => {
      if (!socket || !isConnected) {
        console.warn("[LeadSocketEmit] Socket not connected, skipping emit");
        return;
      }

      const disposition = lead.leadStatus || "fresh";
      const location = lead.location || "";

      socket.emit("new-lead-created", { lead, disposition, location });
      console.log(`📤 [LeadSocketEmit] Emitted new-lead-created:`, {
        name: lead.name,
        disposition,
        location,
      });
    },
    [socket, isConnected]
  );

  const emitDispositionChange = useCallback(
    (lead: IQuery, oldDisposition: string, newDisposition: string) => {
      if (!socket || !isConnected) {
        console.warn("[LeadSocketEmit] Socket not connected, skipping emit");
        return;
      }

      const location = lead.location || "";

      socket.emit("lead-disposition-changed", {
        lead,
        oldDisposition,
        newDisposition,
        location,
      });
      console.log(`📤 [LeadSocketEmit] Emitted lead-disposition-changed:`, {
        name: lead.name,
        oldDisposition,
        newDisposition,
        location,
      });
    },
    [socket, isConnected]
  );

  return { emitNewLead, emitDispositionChange, isConnected };
};
