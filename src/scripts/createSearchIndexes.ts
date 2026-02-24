/**
 * Database Index Creation Script for WhatsApp Search
 * Run this script once to create optimal indexes for search performance
 * 
 * Usage: npx tsx src/scripts/createSearchIndexes.ts
 */

import mongoose from "mongoose";
import WhatsAppConversation from "../models/whatsappConversation";
import WhatsAppMessage from "../models/whatsappMessage";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/adminstro";

async function createSearchIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);

    // ============================================
    // WhatsAppConversation Indexes
    // ============================================
    // Creating WhatsAppConversation indexes...

    // 1. Text index for full-text search on name, phone, notes
    try {
      await WhatsAppConversation.collection.createIndex(
        {
          participantName: "text",
          participantPhone: "text",
          notes: "text",
        },
        {
          name: "search_text_idx",
          weights: {
            participantPhone: 10, // Highest priority
            participantName: 5,
            notes: 1,
          },
          default_language: "english",
        }
      );
      // Text search index created
    } catch (err: any) {
      if (err.code === 85 || err.codeName === "IndexOptionsConflict") {
        // Text index already exists, skipping
      } else {
        throw err;
      }
    }

    // 2. Phone number regex search index
    await WhatsAppConversation.collection.createIndex(
      { participantPhone: 1 },
      { name: "phone_search_idx" }
    );
    // Phone number index created

    // 3. Compound index for permission filtering + sorting
    await WhatsAppConversation.collection.createIndex(
      {
        status: 1,
        lastMessageTime: -1,
        assignedAgent: 1,
      },
      { name: "permission_sort_idx" }
    );
    // Permission + sort index created

    // 4. Location-based filtering index
    await WhatsAppConversation.collection.createIndex(
      { participantLocation: 1, status: 1 },
      { name: "location_filter_idx" }
    );
    // Location filter index created

    // 5. Tags array index for tag search
    await WhatsAppConversation.collection.createIndex(
      { tags: 1 },
      { name: "tags_search_idx" }
    );
    // Tags search index created

    // ============================================
    // WhatsAppMessage Indexes
    // ============================================
    // Creating WhatsAppMessage indexes...

    // 1. Text index for message content search
    try {
      await WhatsAppMessage.collection.createIndex(
        {
          "content.text": "text",
          "content.caption": "text",
        },
        {
          name: "message_content_text_idx",
          weights: {
            "content.text": 1,
            "content.caption": 1,
          },
          default_language: "english",
        }
      );
      // Message content text index created
    } catch (err: any) {
      if (err.code === 85 || err.codeName === "IndexOptionsConflict") {
        // Message text index already exists, skipping
      } else {
        throw err;
      }
    }

    // 2. Conversation + timestamp index for message timeline
    await WhatsAppMessage.collection.createIndex(
      {
        conversationId: 1,
        timestamp: -1,
      },
      { name: "conversation_timeline_idx" }
    );
    // Conversation timeline index created

    // 3. Conversation + type index for filtering reactions
    await WhatsAppMessage.collection.createIndex(
      {
        conversationId: 1,
        type: 1,
        timestamp: -1,
      },
      { name: "conversation_type_idx" }
    );
    // Conversation + type index created

    // 4. Phone number search in messages (from/to fields)
    await WhatsAppMessage.collection.createIndex(
      { from: 1 },
      { name: "message_from_idx" }
    );
    await WhatsAppMessage.collection.createIndex(
      { to: 1 },
      { name: "message_to_idx" }
    );
    // Message phone number indexes created

    // 5. Direction + status index for filtering
    await WhatsAppMessage.collection.createIndex(
      {
        direction: 1,
        status: 1,
        timestamp: -1,
      },
      { name: "direction_status_idx" }
    );
    // Direction + status index created

    // ============================================
    // Verify Indexes
    // ============================================
    // Verifying indexes...

    const convIndexes = await WhatsAppConversation.collection.indexes();
    // WhatsAppConversation indexes verified

    const msgIndexes = await WhatsAppMessage.collection.indexes();
    // WhatsAppMessage indexes verified

    // ============================================
    // Performance Tips
    // ============================================
    // Performance tips and completion (indexes created)
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
if (require.main === module) {
  createSearchIndexes()
    .then(() => {
      // done
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Failed:", error);
      process.exit(1);
    });
}

export default createSearchIndexes;

