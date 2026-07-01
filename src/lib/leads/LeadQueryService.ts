import Query from "@/models/query";
import { buildStatusCountPipeline } from "@/lib/leads/statusCountPipeline";
import { buildPagedLeadListPipeline } from "@/lib/leads/leadListPipeline";
import {
  buildWordsCountGroupFields,
  stripQuickPropertyFiltersFromQuery,
} from "@/util/leadFilterUtils";

const PAGE_SIZE = 50;

const SALES_PRIORITY_SORT_MAP: Record<string, number> = {
  None: 0,
  Medium: 1,
  Low: 2,
  High: 3,
};

export interface LeadListServiceOptions {
  matchQuery: Record<string, unknown>;
  page: number;
  sortBy?: string;
  includeStatusCount?: boolean;
  includeWordsCount?: boolean;
  postProcess?: (
    rows: Record<string, unknown>[],
  ) => Promise<Record<string, unknown>[]>;
}

export interface LeadListServiceResult {
  data: Record<string, unknown>[];
  PAGE: number;
  totalPages: number;
  totalQueries: number;
  wordsCount?: Record<string, unknown>[];
  statusCount?: Record<string, unknown>[];
}

function applySalesPrioritySort(
  rows: Record<string, unknown>[],
  sortBy?: string,
): void {
  if (!sortBy || sortBy === "None") return;

  rows.sort((a, b) => {
    const priorityA =
      SALES_PRIORITY_SORT_MAP[
        String(a.salesPriority ?? "None") as keyof typeof SALES_PRIORITY_SORT_MAP
      ] ?? 0;
    const priorityB =
      SALES_PRIORITY_SORT_MAP[
        String(b.salesPriority ?? "None") as keyof typeof SALES_PRIORITY_SORT_MAP
      ] ?? 0;
    return sortBy === "Asc" ? priorityA - priorityB : priorityB - priorityA;
  });
}

export class LeadQueryService {
  static async list(
    options: LeadListServiceOptions,
  ): Promise<LeadListServiceResult> {
    const {
      matchQuery,
      page,
      sortBy,
      includeStatusCount = false,
      includeWordsCount = false,
      postProcess,
    } = options;

    const skip = (page - 1) * PAGE_SIZE;

    const rows = (await Query.aggregate(
      buildPagedLeadListPipeline(matchQuery, skip, PAGE_SIZE) as never,
    )) as Record<string, unknown>[];

    applySalesPrioritySort(rows, sortBy);

    let data = rows;
    if (postProcess) {
      data = await postProcess(rows);
    }

    const wordsCountMatchQuery = stripQuickPropertyFiltersFromQuery(matchQuery);

    const [statusCount, wordsCount, totalQueries] = await Promise.all([
      includeStatusCount
        ? Query.aggregate(buildStatusCountPipeline(matchQuery))
        : Promise.resolve(undefined),
      includeWordsCount
        ? Query.aggregate([
            { $match: wordsCountMatchQuery },
            { $group: buildWordsCountGroupFields() },
            {
              $project: {
                _id: 0,
                "1bhk": 1,
                "2bhk": 1,
                "3bhk": 1,
                "4bhk": 1,
                studio: 1,
                sharedApartment: 1,
              },
            },
          ] as never)
        : Promise.resolve(undefined),
      Query.countDocuments(matchQuery),
    ]);

    const totalPages = Math.ceil(totalQueries / PAGE_SIZE);

    return {
      data,
      PAGE: page,
      totalPages,
      totalQueries,
      ...(includeWordsCount ? { wordsCount } : {}),
      ...(includeStatusCount ? { statusCount } : {}),
    };
  }
}
