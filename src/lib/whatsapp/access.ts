import { getAllowedPhoneIds, FULL_ACCESS_ROLES } from "./config";
import { canUserSeeConversation } from "./locationAccess";
import WhatsAppConversation from "@/models/whatsappConversation";
import mongoose from "mongoose";

/**
 * Central access validator for WhatsApp conversations.
 * user: token-like object with { id, _id, role, allotedArea }
 * conversation: mongoose document or plain object
 */
export function canAccessConversation(user: any, conversation: any): boolean {
  if (!user || !conversation) return false;

  const userRole = user.role || "";
  const userAreas = Array.isArray(user.allotedArea) ? user.allotedArea : (user.allotedArea ? [user.allotedArea] : []);
  const userId = user._id || user.id;

  // Full access roles (SuperAdmin/Admin/Developer) can access everything
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(userRole)) {
    return true;
  }

  // Internal phone conversations are always accessible
  if (conversation.source === "internal" || conversation.businessPhoneId === "internal-you") {
    return true;
  }

  // Area / phone ID check (base permission)
  const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);
  const hasPhoneAccess = 
    !conversation.businessPhoneId || 
    (allowedPhoneIds.length > 0 && allowedPhoneIds.includes(conversation.businessPhoneId));

  // Retarget rules
  if (conversation.isRetarget) {
    if (userRole === "Sales") {
      // Sales can only access after handover
      if (conversation.retargetStage !== "handed_to_sales") {
        return false;
      }
      
      // If assigned agent is set, only that agent can access
      if (conversation.assignedAgent) {
        const assignedAgentId = typeof conversation.assignedAgent === "string" 
          ? conversation.assignedAgent 
          : conversation.assignedAgent.toString();
        const userIdStr = userId ? userId.toString() : "";
        
        if (assignedAgentId !== userIdStr) {
          return false;
        }
        
        // Assigned agent can access even if phone mismatch
        return true;
      }
      
      // Otherwise, check phone access
      return hasPhoneAccess;
    }
    
    if (userRole === "Advert") {
      // Advert can only see retarget conversations BEFORE handover
      const preHandoverStages = ["initiated", "awaiting_reply", "engaged"];
      return preHandoverStages.includes(conversation.retargetStage || "");
    }
    
    // Other roles cannot access retarget conversations
    return false;
  }

  // Non-retarget: apply full visibility rule (phone AND location key)
  return canUserSeeConversation(user, conversation);
}

/**
 * Determines if socket events should be emitted to a user for a conversation.
 * Same visibility contract as canAccessConversation.
 */
export function shouldEmitToUser(user: any, conversation: any): boolean {
  if (!user || !conversation) return false;

  const userRole = user.role || "";
  const userId = user._id || user.id;

  // Full access roles receive all events
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(userRole)) {
    return true;
  }

  // Internal phone conversations are always accessible
  if (conversation.source === "internal" || conversation.businessPhoneId === "internal-you") {
    return true;
  }

  // Retarget rules
  if (conversation.isRetarget) {
    const userAreas = Array.isArray(user.allotedArea) ? user.allotedArea : (user.allotedArea ? [user.allotedArea] : []);
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);
    const hasPhoneAccess =
      !conversation.businessPhoneId ||
      (allowedPhoneIds.length > 0 && allowedPhoneIds.includes(conversation.businessPhoneId));

    if (userRole === "Sales") {
      if (conversation.retargetStage !== "handed_to_sales") return false;
      if (conversation.assignedAgent) {
        const assignedAgentId =
          typeof conversation.assignedAgent === "string"
            ? conversation.assignedAgent
            : conversation.assignedAgent.toString();
        const userIdStr = userId ? userId.toString() : "";
        if (assignedAgentId !== userIdStr) return false;
        return true;
      }
      return hasPhoneAccess;
    }

    if (userRole === "Advert") {
      const preHandoverStages = ["initiated", "awaiting_reply", "engaged"];
      return preHandoverStages.includes(conversation.retargetStage || "");
    }

    return false;
  }

  // Non-retarget: apply full visibility rule (phone AND location key)
  return canUserSeeConversation(user, conversation);
}

export function assertAccessOrThrow(user: any, conversation: any): void {
  if (!canAccessConversation(user, conversation)) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

