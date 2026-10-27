import mongoose from "mongoose";

import { getMonthlyTargetCities } from "@/lib/monthly-target-locations";
import { dedupeCities, normalizeCityKey } from "@/lib/city-normalizer";
import Employees from "@/models/employee";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";
import { locationRegexForCity } from "@/util/ownerSheetLocationFilter";
import type {
  OwnerSheetDailyPoint,
  OwnerSheetEmployeeStat,
  OwnerSheetEmployeeStats,
  OwnerSheetKind,
} from "@/lib/owner-sheet/employee-stats";

const CHART_EMPLOYEE_LIMIT = 8;
const IST_TIMEZONE = "Asia/Kolkata";

type AggId = {
  date?: string;
  employeeId?: string;
  name?: string;
  email?: string;
  location?: string;
};

type AggRow = {
  _id: AggId;
  count?: number;
};

type EmployeeBucket = {
  employeeId: string;
  name: string;
  email: string;
  total: number;
  byDate: Map<string, number>;
  byLocation: Map<string, number>;
};

function istDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000+05:30`);
}

function istDayEnd(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999+05:30`);
}

function formatIstDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function eachIstDate(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = istDayStart(from).getTime();
  const end = istDayStart(to).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  while (cursor <= end) {
    dates.push(formatIstDate(new Date(cursor)));
    cursor += dayMs;
  }
  return dates;
}

function locationMatch(cities: string[] | null, requested: string): Record<string, unknown> {
  const trimmed = requested.trim();
  const hasRequest = trimmed.length > 0 && trimmed.toLowerCase() !== "all";

  if (cities && cities.length === 0) {
    return { location: { $in: [] } };
  }

  if (cities) {
    const allowed = hasRequest
      ? cities.filter((city) => city.toLowerCase() === trimmed.toLowerCase())
      : cities;
    if (allowed.length === 0) {
      return { location: { $in: [] } };
    }
    return {
      $or: allowed.map((city) => ({ location: locationRegexForCity(city) })),
    };
  }

  if (!hasRequest) return {};
  return { location: locationRegexForCity(trimmed) };
}

async function aggregateSheet(
  model: mongoose.Model<unknown>,
  match: Record<string, unknown>,
): Promise<AggRow[]> {
  return model.aggregate<AggRow>([
    { $match: match },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: IST_TIMEZONE,
            },
          },
          employeeId: { $ifNull: ["$addedByEmployeeId", ""] },
          name: { $ifNull: ["$addedByName", ""] },
          email: { $ifNull: ["$addedByEmail", ""] },
          location: { $ifNull: ["$location", ""] },
        },
        count: { $sum: 1 },
      },
    },
  ]);
}

function preferText(current: string, incoming: string): string {
  return current.trim() || incoming.trim();
}

export async function getOwnerSheetEmployeeStats(params: {
  from: string;
  to: string;
  location: string;
  sheet: OwnerSheetKind;
  /** null means every city. An array limits results to those cities. */
  allowedLocations: string[] | null;
}): Promise<OwnerSheetEmployeeStats> {
  const { from, to, sheet, allowedLocations } = params;
  const location = params.location.trim() || "All";
  const createdAt = {
    $gte: istDayStart(from),
    $lte: istDayEnd(to),
  };

  const match: Record<string, unknown> = {
    createdAt,
    ...locationMatch(allowedLocations, location),
  };
  const locationOptionsMatch: Record<string, unknown> = {
    createdAt,
    ...locationMatch(allowedLocations, "All"),
  };

  const models: mongoose.Model<unknown>[] = [];
  if (sheet === "all" || sheet === "long-term") models.push(unregisteredOwner);
  if (sheet === "all" || sheet === "short-term") models.push(unregisteredOwnerShortTerm);

  const [grouped, distinctLists, targetCities] = await Promise.all([
    Promise.all(models.map((model) => aggregateSheet(model, match))),
    Promise.all(
      models.map((model) =>
        model.distinct("location", locationOptionsMatch).then((values) =>
          values.map((value) => String(value ?? "").trim()).filter(Boolean),
        ),
      ),
    ),
    getMonthlyTargetCities().catch(() => [] as string[]),
  ]);

  const buckets = new Map<string, EmployeeBucket>();
  let unattributed = 0;

  for (const rows of grouped) {
    for (const row of rows) {
      const count = Number(row.count ?? 0);
      if (count <= 0) continue;
      const employeeId = String(row._id.employeeId ?? "").trim();
      if (!employeeId) {
        unattributed += count;
        continue;
      }

      const city = String(row._id.location ?? "").trim() || "Unknown";
      const date = String(row._id.date ?? "");
      const existing = buckets.get(employeeId) ?? {
        employeeId,
        name: "",
        email: "",
        total: 0,
        byDate: new Map<string, number>(),
        byLocation: new Map<string, number>(),
      };
      existing.name = preferText(existing.name, String(row._id.name ?? ""));
      existing.email = preferText(existing.email, String(row._id.email ?? ""));
      existing.total += count;
      if (date) {
        existing.byDate.set(date, (existing.byDate.get(date) ?? 0) + count);
      }
      existing.byLocation.set(city, (existing.byLocation.get(city) ?? 0) + count);
      buckets.set(employeeId, existing);
    }
  }

  const missingNameIds = Array.from(buckets.values())
    .filter((bucket) => !bucket.name && mongoose.Types.ObjectId.isValid(bucket.employeeId))
    .map((bucket) => bucket.employeeId);

  if (missingNameIds.length > 0) {
    const people = await Employees.find({ _id: { $in: missingNameIds } })
      .select("name email")
      .lean<Array<{ _id: mongoose.Types.ObjectId; name?: string; email?: string }>>();
    for (const person of people) {
      const bucket = buckets.get(String(person._id));
      if (!bucket) continue;
      bucket.name = preferText(bucket.name, String(person.name ?? ""));
      bucket.email = preferText(bucket.email, String(person.email ?? ""));
    }
  }

  const employees: OwnerSheetEmployeeStat[] = Array.from(buckets.values())
    .map((bucket) => ({
      employeeId: bucket.employeeId,
      name: bucket.name || bucket.email || "Employee",
      email: bucket.email,
      total: bucket.total,
      locations: Array.from(bucket.byLocation.entries())
        .map(([loc, count]) => ({ location: loc, count }))
        .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location)),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const chartEmployees = employees.slice(0, CHART_EMPLOYEE_LIMIT);
  const dates = eachIstDate(from, to);
  const series: OwnerSheetDailyPoint[] = dates.map((date) => {
    const point: OwnerSheetDailyPoint = { date };
    for (const employee of employees) {
      const bucket = buckets.get(employee.employeeId);
      point[employee.employeeId] = bucket?.byDate.get(date) ?? 0;
    }
    return point;
  });

  const attributed = employees.reduce((sum, employee) => sum + employee.total, 0);
  const scopedTargets =
    allowedLocations === null
      ? targetCities
      : targetCities.filter((city) =>
          allowedLocations.some(
            (allowed) => normalizeCityKey(allowed) === normalizeCityKey(city),
          ),
        );

  return {
    from,
    to,
    location: location.toLowerCase() === "all" ? "All" : location,
    sheet,
    locations: dedupeCities([...distinctLists.flat(), ...scopedTargets]),
    employees,
    chartEmployees,
    series,
    unattributed,
    total: attributed + unattributed,
  };
}
