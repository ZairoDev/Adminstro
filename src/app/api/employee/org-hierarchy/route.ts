import { NextRequest, NextResponse } from "next/server";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { excludeTestAccountFromQuery } from "@/util/employeeConstants";

/** Full company tree — leadership / HR only. */
const FULL_ACCESS = ["HR", "SuperAdmin", "Admin", "HAdmin"] as const;

const BLOCKED_ROLES = new Set(["HCollaborator", "Guest"]);

export type OrgNode = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  employeeCode: string | null;
  profilePic: string | null;
  isReportingManager: boolean;
  children: OrgNode[];
};

export type OrgHierarchyScope = "company" | "team" | "peers";

type Row = {
  _id: unknown;
  name?: string;
  email?: string;
  role?: string;
  jobTitle?: string;
  employeeCode?: string | null;
  profilePic?: string | null;
  reportingManagerId?: unknown;
  isReportingManager?: boolean;
};

type MutableNode = OrgNode & { parentId: string | null };

function toNode(row: Row): MutableNode {
  const id = String(row._id);
  return {
    id,
    name: String(row.name || "").trim() || "Unknown",
    email: String(row.email || "").trim(),
    role: String(row.role || "").trim(),
    jobTitle: String(row.jobTitle || "").trim(),
    employeeCode: row.employeeCode ? String(row.employeeCode) : null,
    profilePic: row.profilePic ? String(row.profilePic).trim() : null,
    isReportingManager: row.isReportingManager === true,
    parentId:
      row.reportingManagerId != null ? String(row.reportingManagerId) : null,
    children: [],
  };
}

function wireTree(nodes: Map<string, MutableNode>): OrgNode[] {
  const roots: MutableNode[] = [];
  for (const node of nodes.values()) {
    node.children = [];
  }
  for (const node of nodes.values()) {
    const parentId = node.parentId;
    if (parentId && nodes.has(parentId) && parentId !== node.id) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function strip(n: MutableNode | OrgNode): OrgNode {
  return {
    id: n.id,
    name: n.name,
    email: n.email,
    role: n.role,
    jobTitle: n.jobTitle,
    employeeCode: n.employeeCode,
    profilePic: n.profilePic,
    isReportingManager: n.isReportingManager,
    children: n.children
      .map(strip)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function collectSubtreeIds(
  rootId: string,
  byId: Map<string, MutableNode>,
): Set<string> {
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    if (!byId.has(id)) continue;
    ids.add(id);
    for (const child of byId.get(id)!.children) {
      stack.push(child.id);
    }
  }
  return ids;
}

/** Walk reportingManagerId chain toward the top (CEO / top management). */
function collectAncestorIds(
  startId: string,
  byId: Map<string, MutableNode>,
): Set<string> {
  const ids = new Set<string>();
  let current = byId.get(startId);
  const seen = new Set<string>();
  while (current?.parentId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    ids.add(parent.id);
    current = parent;
  }
  return ids;
}

/**
 * Corporate scoped view for non-HR:
 * - full manager chain above
 * - own subtree (self + reports)
 * - same-level peers (other leads/ICs under the same manager) as leaves only —
 *   peer team trees are never included
 */
function collectCorporateScopeIds(
  selfId: string,
  byId: Map<string, MutableNode>,
): Set<string> {
  const ids = collectSubtreeIds(selfId, byId);
  for (const id of collectAncestorIds(selfId, byId)) ids.add(id);

  const self = byId.get(selfId);
  const parentId = self?.parentId;
  if (parentId && byId.has(parentId)) {
    for (const node of byId.values()) {
      if (node.parentId === parentId) ids.add(node.id);
    }
  }
  return ids;
}

function subsetMap(
  byId: Map<string, MutableNode>,
  allowed: Set<string>,
): Map<string, MutableNode> {
  const next = new Map<string, MutableNode>();
  for (const id of allowed) {
    const src = byId.get(id);
    if (!src) continue;
    next.set(id, {
      ...src,
      parentId:
        src.parentId && allowed.has(src.parentId) ? src.parentId : null,
      children: [],
    });
  }
  return next;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const role = String(
      (token as { role?: unknown }).role ?? "",
    ).trim();
    const accountId = String((token as { id?: unknown }).id ?? "").trim();

    if (!role || BLOCKED_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    await connectDb();
    const rows = (await Employees.find(
      excludeTestAccountFromQuery({ isActive: { $ne: false } }),
    )
      .select(
        "name email role jobTitle employeeCode profilePic reportingManagerId isReportingManager",
      )
      .lean()) as Row[];

    const byId = new Map<string, MutableNode>();
    for (const row of rows) {
      const node = toNode(row);
      byId.set(node.id, node);
    }
    // Wire once so subtree walks work; re-wire after scoping.
    wireTree(byId);

    const isFullAccess = (FULL_ACCESS as readonly string[]).includes(role);
    let scope: OrgHierarchyScope = "company";
    let scoped = byId;
    let viewerHasReportingManager = false;
    let viewerHasReports = false;

    if (!isFullAccess) {
      const self = byId.get(accountId);
      if (!self) {
        return NextResponse.json(
          { success: false, error: "Employee record not found" },
          { status: 404 },
        );
      }

      viewerHasReportingManager = Boolean(
        self.parentId && byId.has(self.parentId),
      );
      viewerHasReports = self.children.length > 0;
      scope =
        self.isReportingManager || viewerHasReports ? "team" : "peers";

      // Same corporate rule for leads and ICs:
      // chain above + own team + peer names at this level (no peer subtrees).
      // No manager → only self (+ reports if any).
      scoped = subsetMap(byId, collectCorporateScopeIds(self.id, byId));
    }

    const roots = wireTree(scoped);
    const tree = roots.map(strip).sort((a, b) => a.name.localeCompare(b.name));
    const scopedRows = Array.from(scoped.values());

    return NextResponse.json({
      success: true,
      data: {
        tree,
        scope,
        viewerHasReportingManager,
        viewerHasReports,
        totalEmployees: scopedRows.length,
        withManager: scopedRows.filter((n) => n.parentId != null).length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 },
      );
    }
    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : undefined;
    if (status === 401) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    console.error("org-hierarchy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load org hierarchy" },
      { status: 500 },
    );
  }
}
