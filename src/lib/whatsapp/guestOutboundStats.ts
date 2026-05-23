import mongoose from "mongoose";
import WhatsAppMessage from "@/models/whatsappMessage";

/** VacationSaga property listing URLs sent to guests */
export const VACATIONSAGA_LISTING_LINK_PATTERN =
  /vacationsaga\.com\/listing-stay-detail\/[a-zA-Z0-9]+/i;

/**
 * Outgoing text like "options sent", "option sent", "options-sent", etc.
 * Text-only messages; media/video is not matched.
 */
export const OPTIONS_SENT_TEXT_PATTERN =
  /\boptions?[\s_-]*sent\b/i;

export type GuestOutboundStats = {
  listingLinkSentCount: number;
  optionsSentCount: number;
};

export type GuestOutboundStatsMap = Map<string, GuestOutboundStats>;

const EMPTY_STATS: GuestOutboundStats = {
  listingLinkSentCount: 0,
  optionsSentCount: 0,
};

/**
 * Count outgoing listing links and "options sent" texts per guest conversation.
 */
export async function getGuestOutboundStatsByConversationIds(
  conversationIds: mongoose.Types.ObjectId[],
): Promise<GuestOutboundStatsMap> {
  const result: GuestOutboundStatsMap = new Map();
  if (conversationIds.length === 0) return result;

  const listingRegex = VACATIONSAGA_LISTING_LINK_PATTERN.source;
  const optionsRegex = OPTIONS_SENT_TEXT_PATTERN.source;

  const rows = await WhatsAppMessage.aggregate<{
    _id: mongoose.Types.ObjectId;
    listingLinkSentCount: number;
    optionsSentCount: number;
  }>([
    {
      $match: {
        conversationId: { $in: conversationIds },
        direction: "outgoing",
        source: { $ne: "internal" },
      },
    },
    {
      $addFields: {
        bodyText: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$content.text", ""] },
                " ",
                { $ifNull: ["$content.caption", ""] },
              ],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: "$conversationId",
        listingLinkSentCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: [{ $strLenCP: "$bodyText" }, 0] },
                  {
                    $regexMatch: {
                      input: "$bodyText",
                      regex: listingRegex,
                      options: "i",
                    },
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        optionsSentCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "text"] },
                  { $gt: [{ $strLenCP: "$bodyText" }, 0] },
                  {
                    $regexMatch: {
                      input: "$bodyText",
                      regex: optionsRegex,
                      options: "i",
                    },
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  for (const row of rows) {
    result.set(String(row._id), {
      listingLinkSentCount: row.listingLinkSentCount ?? 0,
      optionsSentCount: row.optionsSentCount ?? 0,
    });
  }

  return result;
}

export function mergeGuestOutboundStats<T extends { _id?: unknown; conversationType?: string }>(
  conversations: T[],
  statsMap: GuestOutboundStatsMap,
): (T & GuestOutboundStats)[] {
  return conversations.map((conv) => {
    const id = conv._id != null ? String(conv._id) : "";
    const stats =
      conv.conversationType === "guest" ? statsMap.get(id) ?? EMPTY_STATS : EMPTY_STATS;
    return {
      ...conv,
      listingLinkSentCount: stats.listingLinkSentCount,
      optionsSentCount: stats.optionsSentCount,
    };
  });
}
