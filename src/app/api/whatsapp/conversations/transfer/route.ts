import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import ConversationArchiveState from "@/models/conversationArchiveState";
import { getAllowedPhoneIds, canAccessPhoneId } from "@/lib/whatsapp/config";
import mongoose from "mongoose";

connectDb();

/**
 * Transfer a conversation from one businessPhoneId (location) to another
 * This moves the conversation and all its messages to the target location
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, targetPhoneId } = await req.json();

    if (!conversationId || !targetPhoneId) {
      return NextResponse.json(
        { error: "conversationId and targetPhoneId are required" },
        { status: 400 }
      );
    }

    // Verify user has access to target phone
    const userRole = token.role || "";
    const userAreas = Array.isArray(token.allotedArea)
      ? token.allotedArea
      : token.allotedArea
      ? [token.allotedArea]
      : [];

    if (!canAccessPhoneId(targetPhoneId, userRole, userAreas)) {
      return NextResponse.json(
        { error: "You don't have access to transfer to this phone number" },
        { status: 403 }
      );
    }

    // Get the source conversation
    const sourceConversation = await WhatsAppConversation.findById(conversationId);
    if (!sourceConversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify user has access to source phone
    if (!canAccessPhoneId(sourceConversation.businessPhoneId, userRole, userAreas)) {
      return NextResponse.json(
        { error: "You don't have access to this conversation" },
        { status: 403 }
      );
    }

    // Don't allow transfer to same phone
    if (sourceConversation.businessPhoneId === targetPhoneId) {
      return NextResponse.json(
        { error: "Cannot transfer to the same location" },
        { status: 400 }
      );
    }

    const sourcePhoneId = sourceConversation.businessPhoneId;
    const participantPhone = sourceConversation.participantPhone;

    // Check if a conversation already exists for this participant + target phone
    const existingTargetConversation = await WhatsAppConversation.findOne({
      participantPhone,
      businessPhoneId: targetPhoneId,
    });

    let finalConversationId: mongoose.Types.ObjectId;
    let messagesTransferred = 0;

    if (existingTargetConversation) {
      // Merge: Move all messages to existing conversation
      finalConversationId = existingTargetConversation._id;

      // Update all messages from source conversation to target conversation
      const updateResult = await WhatsAppMessage.updateMany(
        { conversationId: sourceConversation._id },
        {
          $set: {
            conversationId: finalConversationId,
            businessPhoneId: targetPhoneId,
          },
        }
      );
      messagesTransferred = updateResult.modifiedCount;

      // Update target conversation with latest message info if source is newer
      if (
        sourceConversation.lastMessageTime &&
        (!existingTargetConversation.lastMessageTime ||
          sourceConversation.lastMessageTime > existingTargetConversation.lastMessageTime)
      ) {
        existingTargetConversation.lastMessageId = sourceConversation.lastMessageId;
        existingTargetConversation.lastMessageContent = sourceConversation.lastMessageContent;
        existingTargetConversation.lastMessageTime = sourceConversation.lastMessageTime;
        existingTargetConversation.lastMessageDirection = sourceConversation.lastMessageDirection;
        existingTargetConversation.lastMessageStatus = sourceConversation.lastMessageStatus;
      }

      // Merge unread counts
      existingTargetConversation.unreadCount =
        (existingTargetConversation.unreadCount || 0) +
        (sourceConversation.unreadCount || 0);

      // Update first/last message times if needed
      if (
        sourceConversation.firstMessageTime &&
        (!existingTargetConversation.firstMessageTime ||
          sourceConversation.firstMessageTime < existingTargetConversation.firstMessageTime)
      ) {
        existingTargetConversation.firstMessageTime = sourceConversation.firstMessageTime;
      }

      if (
        sourceConversation.lastIncomingMessageTime &&
        (!existingTargetConversation.lastIncomingMessageTime ||
          sourceConversation.lastIncomingMessageTime >
            existingTargetConversation.lastIncomingMessageTime)
      ) {
        existingTargetConversation.lastIncomingMessageTime =
          sourceConversation.lastIncomingMessageTime;
      }

      if (
        sourceConversation.lastOutgoingMessageTime &&
        (!existingTargetConversation.lastOutgoingMessageTime ||
          sourceConversation.lastOutgoingMessageTime >
            existingTargetConversation.lastOutgoingMessageTime)
      ) {
        existingTargetConversation.lastOutgoingMessageTime =
          sourceConversation.lastOutgoingMessageTime;
      }

      // Preserve participant info if target doesn't have it
      if (!existingTargetConversation.participantName && sourceConversation.participantName) {
        existingTargetConversation.participantName = sourceConversation.participantName;
      }
      if (!existingTargetConversation.participantProfilePic && sourceConversation.participantProfilePic) {
        existingTargetConversation.participantProfilePic = sourceConversation.participantProfilePic;
      }
      if (!existingTargetConversation.participantLocation && sourceConversation.participantLocation) {
        existingTargetConversation.participantLocation = sourceConversation.participantLocation;
      }

      await existingTargetConversation.save();

      // Handle archive state: if source is archived, ensure target is also archived
      const sourceArchiveState = await ConversationArchiveState.findOne({
        conversationId: sourceConversation._id,
        isArchived: true,
      });
      
      if (sourceArchiveState) {
        // Check if target conversation is already archived
        const targetArchiveState = await ConversationArchiveState.findOne({
          conversationId: finalConversationId,
        });
        
        if (!targetArchiveState || !targetArchiveState.isArchived) {
          // Archive the target conversation if it's not already archived
          await ConversationArchiveState.findOneAndUpdate(
            { conversationId: finalConversationId },
            {
              conversationId: finalConversationId,
              isArchived: true,
              archivedAt: sourceArchiveState.archivedAt || new Date(),
              archivedBy: sourceArchiveState.archivedBy,
            },
            { upsert: true, new: true }
          );
        }
      }

      // Delete source conversation and its archive state
      await ConversationArchiveState.deleteOne({ conversationId: sourceConversation._id });
      await WhatsAppConversation.findByIdAndDelete(sourceConversation._id);
    } else {
      // Transfer: Update conversation's businessPhoneId
      sourceConversation.businessPhoneId = targetPhoneId;
      await sourceConversation.save();

      finalConversationId = sourceConversation._id;

      // Update all messages' businessPhoneId
      const updateResult = await WhatsAppMessage.updateMany(
        { conversationId: sourceConversation._id },
        {
          $set: {
            businessPhoneId: targetPhoneId,
          },
        }
      );
      messagesTransferred = updateResult.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      conversationId: finalConversationId.toString(),
      messagesTransferred,
      merged: !!existingTargetConversation,
    });
  } catch (error: any) {
    console.error("Transfer conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
