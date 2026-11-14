/**
 * Allocate reporting managers among EXISTING active employees only.
 * Does not create employees. Builds a multi-level tree so
 * /dashboard/employee/org-hierarchy reads fuller.
 *
 * Dry-run (default):
 *   npx tsx src/scripts/allocateOrgHierarchyManagers.ts
 *   npm run allocate:org-managers
 *
 * Apply:
 *   npx tsx src/scripts/allocateOrgHierarchyManagers.ts --apply
 *   npm run allocate:org-managers:apply
 *
 * Overwrites reportingManagerId / isReportingManager on active employees.
 * One root stays without a manager (highest-ranked SuperAdmin, else first).
 */
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";

const APPLY = process.argv.includes("--apply");

type Emp = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  role?: string;
  jobTitle?: string;
  isReportingManager?: boolean;
  reportingManagerId?: mongoose.Types.ObjectId | null;
};

function loadScriptEnv(): void {
  const names = [".env.local", ".env", ".env.production"];
  for (const name of names) {
    const filePath = path.resolve(process.cwd(), name);
    if (!fs.existsSync(filePath)) continue;
    dotenv.config({ path: filePath, override: false });
  }
  if (!process.env.MONGO_DB_URL?.trim() && process.env.MONGODB_URI?.trim()) {
    process.env.MONGO_DB_URL = process.env.MONGODB_URI;
  }
}

function label(e: Emp): string {
  const name = String(e.name || "").trim() || "(unnamed)";
  const role = String(e.role || "?").trim();
  return `${name} [${role}]`;
}

function roleBucket(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("leadgen")) return "leadgen";
  if (r.includes("sales")) return "sales";
  if (r === "hr" || r === "hadmin") return "hr";
  if (r.includes("advert") || r.includes("ads")) return "ads";
  if (r === "superadmin" || r === "admin") return "leadership";
  return "other";
}

function managerScore(e: Emp): number {
  const role = String(e.role || "").toLowerCase();
  const title = String(e.jobTitle || "").toLowerCase();
  let score = 0;
  if (role === "superadmin") score += 100;
  else if (role === "admin" || role === "hadmin") score += 80;
  else if (role === "hr") score += 70;
  else if (role.includes("teamlead") || role.includes("team-lead")) score += 60;
  else if (role.includes("lead")) score += 40;
  if (/\b(manager|director|head|lead|tl)\b/.test(title)) score += 25;
  if (e.isReportingManager === true) score += 15;
  if (e.reportingManagerId) score += 5;
  return score;
}

function pickRoot(people: Emp[]): Emp {
  const ranked = [...people].sort((a, b) => managerScore(b) - managerScore(a));
  return ranked[0]!;
}

/**
 * Choose mid-level managers: one strong person per populated role bucket
 * (leadgen / sales / hr / ads / leadership), prefer TeamLead + existing RMs.
 */
function pickMidManagers(people: Emp[], rootId: string): Emp[] {
  const candidates = people
    .filter((p) => String(p._id) !== rootId)
    .sort((a, b) => managerScore(b) - managerScore(a));

  const byBucket = new Map<string, Emp[]>();
  for (const c of candidates) {
    const b = roleBucket(String(c.role || ""));
    const list = byBucket.get(b) || [];
    list.push(c);
    byBucket.set(b, list);
  }

  const picked: Emp[] = [];
  const take = (bucket: string, max = 1) => {
    const list = byBucket.get(bucket) || [];
    let n = 0;
    for (const c of list) {
      if (picked.some((p) => String(p._id) === String(c._id))) continue;
      // Only promote a bucket mid if that bucket has enough people, or role is strong.
      const bucketSize = list.length;
      if (bucketSize < 2 && managerScore(c) < 60 && c.isReportingManager !== true) {
        continue;
      }
      picked.push(c);
      n += 1;
      if (n >= max) break;
    }
  };

  // Order: functional teams first, then leadership peer, then ads/other.
  take("leadgen", 2); // TeamLead + existing George RM if present
  take("sales", 1);
  take("hr", 1);
  take("ads", 1);
  take("leadership", 1);

  if (picked.length < 2) {
    for (const c of candidates) {
      if (picked.some((p) => String(p._id) === String(c._id))) continue;
      picked.push(c);
      if (picked.length >= 2) break;
    }
  }

  return picked.slice(0, 6);
}

function assignICs(
  ics: Emp[],
  mids: Emp[],
  root: Emp,
): Map<string, string> {
  /** employeeId -> managerId */
  const edges = new Map<string, string>();
  const rootId = String(root._id);
  const midIds = new Set(mids.map((m) => String(m._id)));

  for (const mid of mids) {
    edges.set(String(mid._id), rootId);
  }

  if (mids.length === 0) {
    for (const ic of ics) {
      edges.set(String(ic._id), rootId);
    }
    return edges;
  }

  // Bucket mids for role affinity.
  const midsByBucket = new Map<string, Emp[]>();
  for (const mid of mids) {
    const b = roleBucket(String(mid.role || ""));
    const list = midsByBucket.get(b) || [];
    list.push(mid);
    midsByBucket.set(b, list);
  }

  const load = new Map<string, number>();
  for (const mid of mids) load.set(String(mid._id), 0);

  const leastLoaded = (pool: Emp[]): Emp => {
    return [...pool].sort(
      (a, b) =>
        (load.get(String(a._id)) || 0) - (load.get(String(b._id)) || 0),
    )[0]!;
  };

  for (const ic of ics) {
    if (midIds.has(String(ic._id))) continue;
    const bucket = roleBucket(String(ic.role || ""));
    const preferred = midsByBucket.get(bucket) || [];
    const leadership = midsByBucket.get("leadership") || [];
    // Affinity first, then leadership peer, then any mid — never dump Sales under HR by accident.
    const pool =
      preferred.length > 0
        ? preferred
        : leadership.length > 0
          ? leadership
          : mids;
    const mgr = leastLoaded(pool);
    edges.set(String(ic._id), String(mgr._id));
    load.set(String(mgr._id), (load.get(String(mgr._id)) || 0) + 1);
  }

  // Depth: if one mid has 4+ ICs and another mid exists, promote one IC under that mid
  // to report to the mid and receive 2 of the mid's ICs — skipped for small orgs;
  // instead create a second layer under the heaviest mid when load >= 5.
  const heavyMid = [...load.entries()].sort((a, b) => b[1] - a[1])[0];
  if (heavyMid && heavyMid[1] >= 5) {
    const midId = heavyMid[0];
    const reports = [...edges.entries()]
      .filter(([, mgr]) => mgr === midId)
      .map(([id]) => id);
    const promoteId = reports[0];
    if (promoteId && reports.length >= 4) {
      // promoteId stays under mid; give them 2 siblings as reports
      const reassigned = reports.slice(1, 3);
      for (const id of reassigned) {
        edges.set(id, promoteId);
      }
    }
  }

  return edges;
}

function printTree(
  people: Emp[],
  edges: Map<string, string>,
  managerFlags: Set<string>,
  rootId: string,
): void {
  const byId = new Map(people.map((p) => [String(p._id), p]));
  const children = new Map<string, string[]>();
  for (const [child, parent] of edges) {
    const list = children.get(parent) || [];
    list.push(child);
    children.set(parent, list);
  }

  const walk = (id: string, depth: number) => {
    const e = byId.get(id);
    if (!e) return;
    const flag = managerFlags.has(id) ? " ★RM" : "";
    console.log(`${"  ".repeat(depth)}- ${label(e)}${flag}`);
    const kids = (children.get(id) || []).sort((a, b) =>
      label(byId.get(a)!).localeCompare(label(byId.get(b)!)),
    );
    for (const kid of kids) walk(kid, depth + 1);
  };

  console.log("\nPlanned tree:");
  walk(rootId, 0);

  // Orphans (should be none except root)
  const linked = new Set(edges.keys());
  linked.add(rootId);
  const orphans = people.filter((p) => !linked.has(String(p._id)));
  if (orphans.length) {
    console.log("\nOrphans (unexpected):");
    for (const o of orphans) console.log(`  - ${label(o)}`);
  }
}

async function main() {
  loadScriptEnv();
  await connectDb();

  const people = (await Employees.find({ isActive: { $ne: false } })
    .select(
      "name email role jobTitle isReportingManager reportingManagerId",
    )
    .lean()) as Emp[];

  const usable = people.filter(
    (p) => String(p.name || "").trim() || String(p.email || "").trim(),
  );
  const skipped = people.length - usable.length;

  if (usable.length < 2) {
    console.log(
      `Need at least 2 active named employees. Found ${usable.length}.`,
    );
    return;
  }

  const root = pickRoot(usable);
  const rootId = String(root._id);
  const mids = pickMidManagers(usable, rootId);
  const midIds = new Set(mids.map((m) => String(m._id)));
  const ics = usable.filter(
    (p) => String(p._id) !== rootId && !midIds.has(String(p._id)),
  );

  const edges = assignICs(ics, mids, root);

  // Anyone who is someone's manager must be flagged.
  const managerFlags = new Set<string>([rootId]);
  for (const mgrId of edges.values()) managerFlags.add(mgrId);

  console.log(
    `Active: ${people.length} | usable: ${usable.length} | skipped unnamed: ${skipped}`,
  );
  console.log(`Root: ${label(root)}`);
  console.log(
    `Mid managers (${mids.length}): ${mids.map(label).join(", ") || "(none)"}`,
  );
  console.log(`Reporting links to write: ${edges.size}`);
  console.log(`isReportingManager flags: ${managerFlags.size}`);
  printTree(usable, edges, managerFlags, rootId);

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write.");
    return;
  }

  let updated = 0;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const emp of usable) {
        const id = String(emp._id);
        const nextMgr = edges.get(id) || null;
        const nextFlag = managerFlags.has(id);
        await Employees.updateOne(
          { _id: emp._id },
          {
            $set: {
              reportingManagerId: nextMgr
                ? new mongoose.Types.ObjectId(nextMgr)
                : null,
              isReportingManager: nextFlag,
            },
          },
          { session },
        );
        updated += 1;
      }
    });
  } finally {
    await session.endSession();
  }

  console.log(`\nApplied. Updated ${updated} employees.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
