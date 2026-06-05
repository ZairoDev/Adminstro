import mongoose from "mongoose";

import Employees from "@/models/employee";
import WhatsAppCallLog from "@/models/whatsappCallLog";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import {
  classifyMessagesReplyState,
  type WhatsAppReplyClassification,
} from "@/lib/whatsapp/replyStatusResolver";

function getCreatedAtFilter(
  days: string | null,
): Record<string, unknown> | undefined {
  if (!days) return undefined;

  switch (days) {
    case "yesterday":
      return {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };
    case "last month": {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      return {
        $gte: startOfLastMonth,
        $lt: startOfThisMonth,
      };
    }
    case "this month": {
      const now = new Date();
      const startUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );
      const endUTC = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      );
      return {
        $gte: startUTC,
        $lte: endUTC,
      };
    }
    case "10 days":
      return {
        $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
    case "1 year":
      return {
        $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };
    default:
      return undefined;
  }
}

export type ReplyCountByLocationRow = {
  location: string;
  replied: number;
  notReplied: number;
  notDelivered: number;
  total: number;
};

export type ReplyCountsByLocationFilters = {
  days: string | null;
  createdBy: string | null;
  role?: string;
  assignedArea?: unknown;
};

type ConversationLean = {
  _id: mongoose.Types.ObjectId;
  participantPhone: string;
  participantLocationKey?: string;
  participantLocation?: string;
  assignedAgent?: mongoose.Types.ObjectId;
};

type MessageLean = {
  conversationId: mongoose.Types.ObjectId;
  direction: string;
  status: string;
  timestamp: Date | string;
};

const FAILED_CALL_STATUSES = [
  "failed",
  "missed",
  "timeout",
  "declined",
  "busy",
] as const;

function normalizePhone(phone: string | undefined | null): string {
  return (phone ?? "").toString().replace(/\D/g, "");
}

function resolveConversationLocationKey(
  conv: ConversationLean,
  validLocations: string[],
): string | null {
  const key = (conv.participantLocationKey ?? "").toLowerCase().trim();
  if (key && validLocations.includes(key)) {
    return key;
  }

  const display = (conv.participantLocation ?? "").toLowerCase().trim();
  if (!display) return null;

  const match = validLocations.find(
    (loc) => display.includes(loc) || loc.includes(display),
  );
  return match ?? null;
}

function buildLocationConversationFilter(
  validLocations: string[],
  role: string | undefined,
  assignedArea: unknown,
): Record<string, unknown> {
  const locationOr = [
    { participantLocationKey: { $in: validLocations } },
    ...validLocations.map((loc) => ({
      participantLocation: { $regex: loc, $options: "i" },
    })),
  ];

  const query: Record<string, unknown> = {
    source: { $ne: "internal" },
    $or: locationOr,
  };

  if (
    role !== "SuperAdmin" &&
    role !== "Sales-TeamLead" &&
    role !== "LeadGen-TeamLead" &&
    role !== "Advert"
  ) {
    if (assignedArea) {
      const areaLower: string[] = Array.isArray(assignedArea)
        ? assignedArea.map((a) => String(a).toLowerCase())
        : [String(assignedArea).toLowerCase()];

      const allowedKeys = validLocations.filter((loc) =>
        areaLower.some(
          (area) => loc.includes(area) || area.includes(loc),
        ),
      );

      if (allowedKeys.length === 0) {
        query._id = { $in: [] };
        return query;
      }

      query.$or = [
        { participantLocationKey: { $in: allowedKeys } },
        ...allowedKeys.map((loc) => ({
          participantLocation: { $regex: loc, $options: "i" },
        })),
      ];
    }
  }

  return query;
}

async function resolveAssignedAgentId(
  createdBy: string | null,
): Promise<mongoose.Types.ObjectId | null> {
  if (!createdBy || createdBy === "All") {
    return null;
  }

  const employee = await Employees.findOne({
    $or: [{ email: createdBy }, { name: createdBy }],
    isActive: { $ne: false },
  })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId } | null>();

  if (!employee?._id) {
    return null;
  }

  return employee._id as mongoose.Types.ObjectId;
}

function mergeClassification(
  fromMessages: WhatsAppReplyClassification,
  hasFailedCall: boolean,
): WhatsAppReplyClassification {
  return {
    replied: fromMessages.replied,
    notReplied: fromMessages.notReplied,
    notDelivered: fromMessages.notDelivered || hasFailedCall,
  };
}

/**
 * Reply stats from WhatsAppConversation + WhatsAppMessage + WhatsAppCallLog only.
 * One row per unique participant phone per location (active in the selected period).
 */
export async function aggregateWhatsAppReplyCountsByLocation(
  validLocations: string[],
  filters: ReplyCountsByLocationFilters,
): Promise<ReplyCountByLocationRow[]> {
  const emptyRows = (): ReplyCountByLocationRow[] =>
    validLocations.map((location) => ({
      location,
      replied: 0,
      notReplied: 0,
      notDelivered: 0,
      total: 0,
    }));

  if (validLocations.length === 0) {
    return [];
  }

  const conversationQuery = buildLocationConversationFilter(
    validLocations,
    filters.role,
    filters.assignedArea,
  );

  const timestampFilter = getCreatedAtFilter(filters.days);
  if (timestampFilter) {
    conversationQuery.lastMessageTime = timestampFilter;
  }

  const assignedAgentId = await resolveAssignedAgentId(filters.createdBy);
  if (filters.createdBy && filters.createdBy !== "All" && !assignedAgentId) {
    return emptyRows();
  }

  if (assignedAgentId) {
    conversationQuery.assignedAgent = assignedAgentId;
  }

  const conversations = await WhatsAppConversation.find(conversationQuery)
    .select("_id participantPhone participantLocationKey participantLocation assignedAgent")
    .lean<ConversationLean[]>();

  if (conversations.length === 0) {
    return emptyRows();
  }

  const conversationIds = conversations.map((c) => c._id);
  const messageQuery: Record<string, unknown> = {
    conversationId: { $in: conversationIds },
    source: { $ne: "internal" },
  };
  if (timestampFilter) {
    messageQuery.timestamp = timestampFilter;
  }

  const [messages, failedCalls] = await Promise.all([
    WhatsAppMessage.find(messageQuery)
      .select("conversationId direction status timestamp")
      .lean<MessageLean[]>(),
    WhatsAppCallLog.find({
      conversationId: { $in: conversationIds },
      lifecycleStatus: { $in: [...FAILED_CALL_STATUSES] },
      ...(timestampFilter ? { startedAt: timestampFilter } : {}),
    })
      .select("conversationId participantPhone")
      .lean(),
  ]);

  const messagesByConversation = new Map<string, MessageLean[]>();
  for (const msg of messages) {
    const key = String(msg.conversationId);
    const bucket = messagesByConversation.get(key) ?? [];
    bucket.push(msg);
    messagesByConversation.set(key, bucket);
  }

  const failedCallConversationIds = new Set(
    failedCalls.map((call) => String(call.conversationId)),
  );

  const counts = new Map<string, ReplyCountByLocationRow>();
  for (const loc of validLocations) {
    counts.set(loc, {
      location: loc,
      replied: 0,
      notReplied: 0,
      notDelivered: 0,
      total: 0,
    });
  }

  /** location -> phone -> merged classification */
  const participantState = new Map<
    string,
    Map<string, WhatsAppReplyClassification>
  >();

  for (const conv of conversations) {
    const locationKey = resolveConversationLocationKey(conv, validLocations);
    if (!locationKey) continue;

    const phone = normalizePhone(conv.participantPhone);
    if (phone.length < 7) continue;

    const convMessages = messagesByConversation.get(String(conv._id)) ?? [];
    const msgClassification = classifyMessagesReplyState(convMessages);
    const hasFailedCall = failedCallConversationIds.has(String(conv._id));
    const classification = mergeClassification(msgClassification, hasFailedCall);

    if (!participantState.has(locationKey)) {
      participantState.set(locationKey, new Map());
    }
    const phoneMap = participantState.get(locationKey)!;

    const existing = phoneMap.get(phone);
    if (!existing) {
      phoneMap.set(phone, classification);
      continue;
    }

    phoneMap.set(phone, {
      replied: existing.replied || classification.replied,
      notReplied: existing.notReplied || classification.notReplied,
      notDelivered: existing.notDelivered || classification.notDelivered,
    });
  }

  for (const [locationKey, phoneMap] of participantState) {
    const row =
      counts.get(locationKey) ??
      ({
        location: locationKey,
        replied: 0,
        notReplied: 0,
        notDelivered: 0,
        total: 0,
      } satisfies ReplyCountByLocationRow);

    for (const classification of phoneMap.values()) {
      row.total += 1;
      if (classification.replied) row.replied += 1;
      if (classification.notReplied) row.notReplied += 1;
      if (classification.notDelivered) row.notDelivered += 1;
    }

    counts.set(locationKey, row);
  }

  const finalResult = validLocations.map(
    (loc) =>
      counts.get(loc) ?? {
        location: loc,
        replied: 0,
        notReplied: 0,
        notDelivered: 0,
        total: 0,
      },
  );

  finalResult.sort((a, b) => a.location.localeCompare(b.location));
  return finalResult;
}
