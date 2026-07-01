import type { PipelineStage } from "mongoose";

/**
 * Message-status breakdown for the current lead filter.
 * Must include $match so we never scan the full collection.
 */
export function buildStatusCountPipeline(
  matchQuery: Record<string, unknown>,
): PipelineStage[] {
  return [
    { $match: matchQuery },
    {
      $group: {
        _id: "$messageStatus",
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        First: {
          $sum: { $cond: [{ $eq: ["$_id", "First"] }, "$count", 0] },
        },
        Second: {
          $sum: { $cond: [{ $eq: ["$_id", "Second"] }, "$count", 0] },
        },
        Third: {
          $sum: { $cond: [{ $eq: ["$_id", "Third"] }, "$count", 0] },
        },
        Fourth: {
          $sum: { $cond: [{ $eq: ["$_id", "Fourth"] }, "$count", 0] },
        },
        Options: {
          $sum: { $cond: [{ $eq: ["$_id", "Options"] }, "$count", 0] },
        },
        Visit: {
          $sum: { $cond: [{ $eq: ["$_id", "Visit"] }, "$count", 0] },
        },
        None: {
          $sum: { $cond: [{ $eq: ["$_id", "None"] }, "$count", 0] },
        },
        Null: {
          $sum: { $cond: [{ $eq: ["$_id", null] }, "$count", 0] },
        },
      },
    },
    { $project: { _id: 0 } },
  ];
}
