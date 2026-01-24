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
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n📊 Creating search indexes...\n");

    // ============================================
    // WhatsAppConversation Indexes
    // ============================================
    console.log("📝 Creating WhatsAppConversation indexes...");

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
      console.log("  ✅ Text search index created");
    } catch (err: any) {
      if (err.code === 85 || err.codeName === "IndexOptionsConflict") {
        console.log("  ⚠️  Text index already exists, skipping");
      } else {
        throw err;
      }
    }

    // 2. Phone number regex search index
    await WhatsAppConversation.collection.createIndex(
      { participantPhone: 1 },
      { name: "phone_search_idx" }
    );
    console.log("  ✅ Phone number index created");

    // 3. Compound index for permission filtering + sorting
    await WhatsAppConversation.collection.createIndex(
      {
        status: 1,
        lastMessageTime: -1,
        assignedAgent: 1,
      },
      { name: "permission_sort_idx" }
    );
    console.log("  ✅ Permission + sort index created");

    // 4. Location-based filtering index
    await WhatsAppConversation.collection.createIndex(
      { participantLocation: 1, status: 1 },
      { name: "location_filter_idx" }
    );
    console.log("  ✅ Location filter index created");

    // 5. Tags array index for tag search
    await WhatsAppConversation.collection.createIndex(
      { tags: 1 },
      { name: "tags_search_idx" }
    );
    console.log("  ✅ Tags search index created");

    // ============================================
    // WhatsAppMessage Indexes
    // ============================================
    console.log("\n📝 Creating WhatsAppMessage indexes...");

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
      console.log("  ✅ Message content text index created");
    } catch (err: any) {
      if (err.code === 85 || err.codeName === "IndexOptionsConflict") {
        console.log("  ⚠️  Message text index already exists, skipping");
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
    console.log("  ✅ Conversation timeline index created");

    // 3. Conversation + type index for filtering reactions
    await WhatsAppMessage.collection.createIndex(
      {
        conversationId: 1,
        type: 1,
        timestamp: -1,
      },
      { name: "conversation_type_idx" }
    );
    console.log("  ✅ Conversation + type index created");

    // 4. Phone number search in messages (from/to fields)
    await WhatsAppMessage.collection.createIndex(
      { from: 1 },
      { name: "message_from_idx" }
    );
    await WhatsAppMessage.collection.createIndex(
      { to: 1 },
      { name: "message_to_idx" }
    );
    console.log("  ✅ Message phone number indexes created");

    // 5. Direction + status index for filtering
    await WhatsAppMessage.collection.createIndex(
      {
        direction: 1,
        status: 1,
        timestamp: -1,
      },
      { name: "direction_status_idx" }
    );
    console.log("  ✅ Direction + status index created");

    // ============================================
    // Verify Indexes
    // ============================================
    console.log("\n🔍 Verifying indexes...\n");

    const convIndexes = await WhatsAppConversation.collection.indexes();
    console.log("WhatsAppConversation indexes:");
    convIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    const msgIndexes = await WhatsAppMessage.collection.indexes();
    console.log("\nWhatsAppMessage indexes:");
    msgIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // ============================================
    // Performance Tips
    // ============================================
    console.log("\n💡 Performance Tips:");
    console.log("  1. Text indexes are case-insensitive by default");
    console.log("  2. Use $text operator for full-text search");
    console.log("  3. Use regex with anchors (^ or $) for phone search");
    console.log("  4. Always include permission filters in queries");
    console.log("  5. Monitor slow queries with MongoDB profiler");
    console.log("  6. Consider adding compound indexes for frequent query patterns");

    console.log("\n✅ All search indexes created successfully!");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
if (require.main === module) {
  createSearchIndexes()
    .then(() => {
      console.log("\n✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Failed:", error);
      process.exit(1);
    });
}

export default createSearchIndexes;

