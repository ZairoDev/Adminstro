/**
 * One-time migration: map legacy Employee isActive / inactiveDate records onto
 * the People hub Candidate lifecycle (employeeId, employedAt, exitedAt).
 *
 * People Employed / Exited tabs query Candidates, not Employees. Older staff
 * were created from "Create Employee" with no candidate link, and exits only
 * set Employees.isActive. This script:
 *   1. Repairs Candidate.employeeId ↔ Employees.candidateId
 *   2. Links unmatched employees to existing candidates by email
 *   3. Creates a candidate shell for remaining employees so they appear in People
 *   4. Backfills employedAt from dateOfJoining
 *   5. Copies isActive=false → exitedAt / exitReason
 *   6. Clears stale exitedAt when the employee is active again
 *
 * Dry-run (default):
 *   npx tsx src/scripts/migrateEmployeeLifecycle.ts
 *   npm run migrate:employee-lifecycle
 *
 * Apply:
 *   npx tsx src/scripts/migrateEmployeeLifecycle.ts --apply
 *   npm run migrate:employee-lifecycle:apply
 *
 * Production env files are `.env.production` / `.env.local` (not `.env`).
 * This script loads those automatically. Immediate workaround on the VPS:
 *   cd /var/www/adminstro
 *   DOTENV_CONFIG_PATH=.env.production npx tsx src/scripts/migrateEmployeeLifecycle.ts
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { Types } from "mongoose";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import Employees from "@/models/employee";
import { asCandidateExitReason } from "@/lib/candidate/markCandidateExited";

const APPLY = process.argv.includes("--apply");
const LEGACY_PLACEHOLDER = "legacy-migration";

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function loadScriptEnv(): { loaded: string[]; tried: string[] } {
  const loaded: string[] = [];
  const tried: string[] = [];
  const names = [".env.production", ".env.local", ".env"];
  const roots = [process.cwd(), "/var/www/adminstro"];
  const uniquePaths: string[] = [];

  if (process.env.DOTENV_CONFIG_PATH) {
    uniquePaths.push(path.resolve(process.env.DOTENV_CONFIG_PATH));
  }

  for (const root of roots) {
    for (const name of names) {
      const filePath = path.resolve(root, name);
      if (!uniquePaths.includes(filePath)) uniquePaths.push(filePath);
    }
  }

  for (const filePath of uniquePaths) {
    tried.push(filePath);
    if (!fileExists(filePath)) continue;
    const result = dotenv.config({ path: filePath, override: false });
    if (!result.error) loaded.push(filePath);
  }

  if (!process.env.MONGO_DB_URL?.trim() && process.env.MONGODB_URI?.trim()) {
    process.env.MONGO_DB_URL = process.env.MONGODB_URI;
  }

  return { loaded, tried };
}

const scriptEnv = loadScriptEnv();

interface EmployeeRow {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  experience?: number;
  address?: string;
  country?: string;
  gender?: string;
  profilePic?: string;
  allotedArea?: unknown;
  dateOfJoining?: Date | null;
  createdAt?: Date;
  isActive?: boolean;
  inactiveReason?: string | null;
  inactiveDate?: Date | null;
  candidateId?: Types.ObjectId | null;
}

interface CandidateRow {
  _id: Types.ObjectId;
  email?: string;
  employeeId?: Types.ObjectId | null;
  employedAt?: Date | null;
  exitedAt?: Date | null;
  exitReason?: string | null;
}

function normalizeEmail(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function idString(value: Types.ObjectId | string | null | undefined): string {
  return value ? String(value) : "";
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCurrentlyActive(employee: EmployeeRow): boolean {
  return employee.isActive !== false;
}

function employedAtFrom(employee: EmployeeRow): Date {
  return (
    asDate(employee.dateOfJoining) ??
    asDate(employee.createdAt) ??
    new Date()
  );
}

function exitedAtFrom(employee: EmployeeRow): Date {
  return asDate(employee.inactiveDate) ?? new Date();
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function firstArea(employee: EmployeeRow): string {
  const raw = employee.allotedArea;
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  const area = values
    .map((value) => String(value).trim())
    .find((value) => value.length > 0);
  return area || "Unknown";
}

function candidateShellFromEmployee(employee: EmployeeRow) {
  const name = asText(employee.name, "Unknown");
  const email = asText(employee.email);
  const phone = asText(employee.phone, "0000000000");
  const employedAt = employedAtFrom(employee);
  const photo = asText(employee.profilePic, LEGACY_PLACEHOLDER);
  const gender =
    employee.gender === "Male" ||
    employee.gender === "Female" ||
    employee.gender === "Other"
      ? employee.gender
      : null;

  const shell: Record<string, unknown> = {
    name,
    email,
    phone,
    experience:
      typeof employee.experience === "number" &&
      Number.isFinite(employee.experience)
        ? employee.experience
        : Number.parseFloat(String(employee.experience ?? "")) || 0,
    address: asText(employee.address, "N/A"),
    city: firstArea(employee),
    gender,
    country: asText(employee.country, "India"),
    college: "N/A",
    position: asText(employee.role, "Employee"),
    resumeUrl: LEGACY_PLACEHOLDER,
    photoUrl: photo,
    status: "onboarding",
    employeeId: employee._id,
    employedAt,
    onboardingStartedAt: employedAt,
    onboardingDetails: {
      onboardingComplete: true,
      completedAt: employedAt,
      verifiedByHR: {
        verified: true,
        verifiedBy: "legacy-migration",
        verifiedAt: employedAt,
        notes: "Backfilled from existing employee record",
      },
    },
  };

  if (!isCurrentlyActive(employee)) {
    shell.exitedAt = exitedAtFrom(employee);
    shell.exitReason = asCandidateExitReason(employee.inactiveReason);
  }

  return shell;
}

async function run(): Promise<void> {
  if (!process.env.MONGO_DB_URL?.trim()) {
    console.error("MONGO_DB_URL is not defined.");
    console.error(
      `Loaded env files: ${scriptEnv.loaded.length > 0 ? scriptEnv.loaded.join(", ") : "(none)"}`
    );
    console.error("Looked in:");
    for (const filePath of scriptEnv.tried) {
      console.error(`  - ${filePath}`);
    }
    console.error("");
    console.error("The VPS keeps secrets in .env.production / .env.local, not .env.");
    console.error("Run from the live app dir, or point dotenv at that file:");
    console.error("  cd /var/www/adminstro");
    console.error("  DOTENV_CONFIG_PATH=.env.production npx tsx src/scripts/migrateEmployeeLifecycle.ts");
    process.exit(1);
  }

  await connectDb();

  const employees = (await Employees.find({})
    .select(
      "name email phone role experience address country gender profilePic allotedArea dateOfJoining createdAt isActive inactiveReason inactiveDate candidateId"
    )
    .lean()) as EmployeeRow[];

  const candidates = (await Candidate.find({})
    .select("email employeeId employedAt exitedAt exitReason")
    .lean()) as CandidateRow[];

  const candidateById = new Map<string, CandidateRow>();
  const candidateByEmployeeId = new Map<string, CandidateRow>();
  const unlinkedByEmail = new Map<string, CandidateRow[]>();

  for (const candidate of candidates) {
    candidateById.set(idString(candidate._id), candidate);
    const linkedEmployeeId = idString(candidate.employeeId);
    if (linkedEmployeeId) {
      candidateByEmployeeId.set(linkedEmployeeId, candidate);
    } else {
      const email = normalizeEmail(candidate.email);
      if (!email) continue;
      const bucket = unlinkedByEmail.get(email) ?? [];
      bucket.push(candidate);
      unlinkedByEmail.set(email, bucket);
    }
  }

  const claimedCandidateIds = new Set<string>();
  const claimedEmails = new Set<string>();

  let alreadyLinked = 0;
  let linkedByEmployeeId = 0;
  let linkedByEmail = 0;
  let wouldCreate = 0;
  let skippedMissingEmail = 0;
  let conflicts = 0;
  let backfillEmployedAt = 0;
  let markExited = 0;
  let clearStaleExit = 0;
  let repairReverseLink = 0;

  const conflictNotes: string[] = [];
  const createdNotes: string[] = [];

  for (const employee of employees) {
    const employeeId = idString(employee._id);
    const email = normalizeEmail(employee.email);
    let candidate: CandidateRow | undefined;
    let linkSource: "existing" | "employeeId" | "email" | "create" | "skip" =
      "skip";

    const pointed = employee.candidateId
      ? candidateById.get(idString(employee.candidateId))
      : undefined;
    const reverse = candidateByEmployeeId.get(employeeId);

    if (pointed && reverse && idString(pointed._id) !== idString(reverse._id)) {
      conflicts += 1;
      conflictNotes.push(
        `${employee.email || employeeId}: employee.candidateId=${idString(pointed._id)} but candidate.employeeId points at a different candidate ${idString(reverse._id)}`
      );
      continue;
    }

    if (pointed) {
      candidate = pointed;
      linkSource = "existing";
      alreadyLinked += 1;
    } else if (reverse) {
      candidate = reverse;
      linkSource = "employeeId";
      linkedByEmployeeId += 1;
    } else if (email) {
      const matches = (unlinkedByEmail.get(email) ?? []).filter(
        (row) => !claimedCandidateIds.has(idString(row._id))
      );
      if (matches.length > 1) {
        conflicts += 1;
        conflictNotes.push(
          `${employee.email}: ${matches.length} unlinked candidates share this email`
        );
        continue;
      }
      if (matches.length === 1) {
        candidate = matches[0];
        linkSource = "email";
        linkedByEmail += 1;
      }
    }

    if (!candidate) {
      if (!email) {
        skippedMissingEmail += 1;
        conflictNotes.push(
          `${employeeId} (${employee.name || "unnamed"}): no email, cannot create candidate`
        );
        continue;
      }
      if (claimedEmails.has(email)) {
        conflicts += 1;
        conflictNotes.push(
          `${employee.email}: another employee in this run already claimed this email`
        );
        continue;
      }
      linkSource = "create";
      wouldCreate += 1;
      createdNotes.push(
        `${employee.email} (${isCurrentlyActive(employee) ? "employed" : "exited"})`
      );
    }

    if (candidate) {
      claimedCandidateIds.add(idString(candidate._id));
    }
    if (email) claimedEmails.add(email);

    const needsReverseLink =
      Boolean(candidate) &&
      idString(employee.candidateId) !== idString(candidate?._id);
    const needsForwardLink =
      Boolean(candidate) &&
      idString(candidate?.employeeId) !== employeeId;
    if (needsReverseLink || needsForwardLink) {
      repairReverseLink += 1;
    }

    const needsEmployedAt = Boolean(candidate) && !asDate(candidate?.employedAt);
    if (linkSource === "create" || needsEmployedAt) {
      backfillEmployedAt += 1;
    }

    if (!isCurrentlyActive(employee)) {
      const alreadyExited = Boolean(asDate(candidate?.exitedAt));
      if (linkSource === "create" || !alreadyExited) {
        markExited += 1;
      }
    } else if (asDate(candidate?.exitedAt)) {
      clearStaleExit += 1;
    }

    if (!APPLY) continue;

    try {
      if (linkSource === "create") {
        const created = await Candidate.create(
          candidateShellFromEmployee(employee)
        );
        await Employees.findByIdAndUpdate(employee._id, {
          $set: { candidateId: created._id },
        });
        continue;
      }

      if (!candidate) continue;

      const candidateSet: Record<string, unknown> = {};
      if (needsForwardLink) {
        candidateSet.employeeId = employee._id;
      }
      if (needsEmployedAt) {
        candidateSet.employedAt = employedAtFrom(employee);
      }

      if (!isCurrentlyActive(employee)) {
        if (!asDate(candidate.exitedAt)) {
          candidateSet.exitedAt = exitedAtFrom(employee);
        }
        if (!candidate.exitReason) {
          const reason = asCandidateExitReason(employee.inactiveReason);
          if (reason) candidateSet.exitReason = reason;
        }
      } else if (asDate(candidate.exitedAt)) {
        candidateSet.exitedAt = null;
        candidateSet.exitReason = null;
        candidateSet.exitNotes = null;
      }

      if (Object.keys(candidateSet).length > 0) {
        await Candidate.findByIdAndUpdate(candidate._id, { $set: candidateSet });
      }

      if (needsReverseLink) {
        await Employees.findByIdAndUpdate(employee._id, {
          $set: { candidateId: candidate._id },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      conflictNotes.push(
        `${employee.email || employeeId}: apply failed: ${message}`
      );
      console.error(`Failed on ${employee.email || employeeId}:`, error);
    }
  }

  const activeCount = employees.filter(isCurrentlyActive).length;
  const inactiveCount = employees.length - activeCount;

  console.log("=== Employee lifecycle → People migration ===");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN (no writes)"}`);
  console.log("");
  console.log(`Employees scanned: ${employees.length}`);
  console.log(`  currently active (isActive !== false): ${activeCount}`);
  console.log(`  currently inactive: ${inactiveCount}`);
  console.log(`Existing candidates: ${candidates.length}`);
  console.log("");
  console.log("Linking");
  console.log(`  already linked both ways / by candidateId: ${alreadyLinked}`);
  console.log(`  recovered via Candidate.employeeId: ${linkedByEmployeeId}`);
  console.log(`  matched unlinked candidate by email: ${linkedByEmail}`);
  console.log(`  candidate shells to create: ${wouldCreate}`);
  console.log(`  skipped (no email): ${skippedMissingEmail}`);
  console.log(`  conflicts skipped: ${conflicts}`);
  console.log(`  reverse/forward link repairs: ${repairReverseLink}`);
  console.log("");
  console.log("Lifecycle fields");
  console.log(`  employedAt backfill: ${backfillEmployedAt}`);
  console.log(`  mark exited from isActive=false: ${markExited}`);
  console.log(`  clear stale exit on active employees: ${clearStaleExit}`);

  if (createdNotes.length > 0) {
    console.log("");
    console.log("Candidate shells (first 25):");
    for (const note of createdNotes.slice(0, 25)) {
      console.log(`  - ${note}`);
    }
    if (createdNotes.length > 25) {
      console.log(`  … ${createdNotes.length - 25} more`);
    }
  }

  if (conflictNotes.length > 0) {
    console.log("");
    console.log("Conflicts / skips (first 25):");
    for (const note of conflictNotes.slice(0, 25)) {
      console.log(`  - ${note}`);
    }
    if (conflictNotes.length > 25) {
      console.log(`  … ${conflictNotes.length - 25} more`);
    }
  }

  if (!APPLY) {
    console.log("");
    console.log("Re-run with --apply to write these changes:");
    console.log("  npm run migrate:employee-lifecycle:apply");
  } else {
    console.log("");
    console.log("Done. Employed / Exited tabs on /dashboard/people should now list these people.");
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Employee lifecycle migration failed:", error);
    process.exit(1);
  });
