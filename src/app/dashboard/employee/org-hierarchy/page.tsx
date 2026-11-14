"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import axios from "@/util/axios";
import { useAuthStore } from "@/AuthStore";
import { InfinityLoader } from "@/components/Loaders";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrgNode = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  employeeCode: string | null;
  profilePic: string | null;
  isReportingManager?: boolean;
  isTrainer?: boolean;
  children: OrgNode[];
};

type HierarchyMode = "reporting" | "training";
type OrgScope = "company" | "team" | "peers";
type TrainerScope = "company" | "mine" | "cohort";

const LEVEL_COLORS = [
  "#4f46e5",
  "#ca8a04",
  "#0d9488",
  "#059669",
  "#2563eb",
  "#dc2626",
];

const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: "#4f46e5",
  Admin: "#6366f1",
  HR: "#db2777",
  HAdmin: "#c026d3",
  Sales: "#ca8a04",
  "Sales-TeamLead": "#d97706",
  "sales-intern": "#eab308",
  "Sales-Onboarding": "#f59e0b",
  "Sales-Onboarding-Broker": "#fbbf24",
  LeadGen: "#0d9488",
  "LeadGen-TeamLead": "#14b8a6",
  Advert: "#2563eb",
  Content: "#0891b2",
  Developer: "#7c3aed",
  Guest: "#64748b",
  Intern: "#94a3b8",
  hSale: "#ea580c",
};

const ROLE_FALLBACK = [
  "#4f46e5",
  "#0d9488",
  "#ca8a04",
  "#db2777",
  "#2563eb",
  "#059669",
  "#ea580c",
  "#7c3aed",
];

const LINE = "#94a3b8";
/** Fixed “You” marker — same for every logged-in viewer. */
const YOU_ACCENT = "#64748b";
/** Full gap parent → child. Fork sits at STEM/2 (classic T-junction). */
const STEM = 44;
const HALF = STEM / 2;
const AVATAR_CHILD = 56;
const PILL_W = 156;
const NAME_FS = 14;
const TITLE_FS = 12;
/** Padding inside the dedicated graph box (each side). */
const BOX_PAD_X = 16;
const BOX_PAD_Y = 16;
const VIEW_MIN_H = 420;
const DRAG_THRESHOLD = 4;

function levelColor(depth: number) {
  return LEVEL_COLORS[Math.min(depth, LEVEL_COLORS.length - 1)];
}

function roleColor(role: string) {
  const key = (role || "").trim();
  if (key && ROLE_COLORS[key]) return ROLE_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return ROLE_FALLBACK[Math.abs(hash) % ROLE_FALLBACK.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function labelFor(node: OrgNode, currentUserId: string | null) {
  if (currentUserId && node.id === currentUserId) return "You";
  return node.name;
}

function Avatar({
  node,
  accent,
  size,
  className,
}: {
  node: OrgNode;
  accent: string;
  size: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-muted shadow-md shrink-0 border-[3px]",
        className,
      )}
      style={{ width: size, height: size, borderColor: accent }}
    >
      {node.profilePic ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.profilePic}
          alt={node.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="h-full w-full flex items-center justify-center font-semibold text-white"
          style={{
            backgroundColor: accent,
            fontSize: Math.max(14, size * 0.28),
          }}
        >
          {initials(node.name) || "?"}
        </div>
      )}
    </div>
  );
}

/**
 * Side: round capsule — avatar fused to pill on the right (no connector dots).
 * Stack: avatar above pill.
 */
function PersonCard({
  node,
  accent,
  currentUserId,
  showTrainerBadge,
}: {
  node: OrgNode;
  accent: string;
  currentUserId: string | null;
  showTrainerBadge?: boolean;
}) {
  const title = node.jobTitle || node.role || "Employee";
  const label = labelFor(node, currentUserId);
  const isYou = Boolean(currentUserId && node.id === currentUserId);
  const tone = isYou ? YOU_ACCENT : accent;
  const trainerBadge = showTrainerBadge && node.isTrainer === true;

  return (
    <Link
      href={`/dashboard/employeedetails/${node.id}`}
      className="org-person relative z-[2] flex flex-col items-center no-underline mx-auto"
      style={{ width: PILL_W }}
      title={`${node.name} · ${title}`}
    >
      <Avatar
        node={node}
        accent={tone}
        size={AVATAR_CHILD}
        className="relative z-10"
      />
      <div
        className="relative z-0 -mt-2.5 pt-3.5 pb-1.5 px-2 text-center text-white shadow-md box-border"
        style={{
          width: PILL_W,
          borderRadius: 9999,
          backgroundColor: tone,
        }}
      >
        <p
          className="font-semibold leading-tight truncate"
          style={{ fontSize: NAME_FS }}
        >
          {label}
        </p>
        <p
          className="opacity-90 leading-tight truncate mt-0.5"
          style={{ fontSize: TITLE_FS }}
        >
          {title}
        </p>
        {trainerBadge ? (
          <p className="text-[8px] font-medium tracking-wide uppercase opacity-90 mt-0.5 truncate">
            Trainer
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/** Unassigned list — simple stack, no dots, color by role. */
function UnassignedCard({
  node,
  currentUserId,
  showTrainerBadge,
}: {
  node: OrgNode;
  currentUserId: string | null;
  showTrainerBadge?: boolean;
}) {
  const isYou = Boolean(currentUserId && node.id === currentUserId);
  const accent = isYou ? YOU_ACCENT : roleColor(node.role);
  const title = node.jobTitle || node.role || "Employee";
  const label = labelFor(node, currentUserId);
  const trainerBadge = showTrainerBadge && node.isTrainer === true;
  return (
    <Link
      href={`/dashboard/employeedetails/${node.id}`}
      className="flex flex-col items-center no-underline w-[150px]"
    >
      <Avatar node={node} accent={accent} size={52} />
      <div
        className="mt-2 w-full rounded-xl px-2.5 py-1.5 text-center text-white shadow-sm"
        style={{ backgroundColor: accent }}
      >
        <p className="font-semibold text-xs leading-tight truncate" title={node.name}>
          {label}
        </p>
        <p className="text-[10px] opacity-90 leading-tight truncate mt-0.5" title={title}>
          {title}
        </p>
        {trainerBadge ? (
          <p className="text-[9px] font-medium tracking-wide uppercase opacity-90 mt-0.5">
            Trainer
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function OrgBranch({
  node,
  depth,
  currentUserId,
  showTrainerBadge,
}: {
  node: OrgNode;
  depth: number;
  currentUserId: string | null;
  showTrainerBadge?: boolean;
}) {
  const kids = node.children;
  const accent = levelColor(depth);
  const hasKids = kids.length > 0;

  return (
    <li className="org-li">
      <div className="org-card">
        <PersonCard
          node={node}
          accent={accent}
          currentUserId={currentUserId}
          showTrainerBadge={showTrainerBadge}
        />
      </div>
      {hasKids ? (
        <ul className={cn("org-children", kids.length === 1 && "is-single")}>
          {kids.map((child) => (
            <OrgBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              currentUserId={currentUserId}
              showTrainerBadge={showTrainerBadge}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Full-size chart by default. Drag to pan when it overflows.
 * “Fit to screen” scales the whole graph into the viewport.
 */
function OrgTree({
  root,
  currentUserId,
  showTrainerBadge,
}: {
  root: OrgNode;
  currentUserId: string | null;
  showTrainerBadge?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef({ w: 1, h: 1 });

  const [fitted, setFitted] = useState(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    origTx: 0,
    origTy: 0,
  });
  const suppressClickRef = useRef(false);
  const viewRef = useRef({ fitted: false, scale: 1, tx: 0, ty: 0 });
  viewRef.current = { fitted, scale, tx, ty };

  const measureNatural = () => {
    const stage = stageRef.current;
    if (!stage) return { w: 1, h: 1 };
    const prev = stage.style.transform;
    stage.style.transform = "none";
    const w = Math.max(stage.scrollWidth, 1);
    const h = Math.max(stage.scrollHeight, 1);
    stage.style.transform = prev;
    naturalRef.current = { w, h };
    return { w, h };
  };

  const centerActual = (nw: number, nh: number) => {
    const vp = viewportRef.current;
    if (!vp) return { tx: 0, ty: BOX_PAD_Y };
    const vw = Math.max(vp.clientWidth, 1);
    const vh = Math.max(vp.clientHeight, 1);
    return {
      tx: Math.round((vw - nw) / 2),
      ty: Math.round(Math.max(BOX_PAD_Y, Math.min((vh - nh) / 2, BOX_PAD_Y + 24))),
    };
  };

  const computeFit = (nw: number, nh: number) => {
    const vp = viewportRef.current;
    if (!vp) return { scale: 1, tx: 0, ty: 0 };
    const vw = Math.max(vp.clientWidth - BOX_PAD_X * 2, 1);
    const vh = Math.max(vp.clientHeight - BOX_PAD_Y * 2, 1);
    const nextScale = Math.min(vw / nw, vh / nh, 1);
    return {
      scale: nextScale,
      tx: Math.round(BOX_PAD_X + (vw - nw * nextScale) / 2),
      ty: Math.round(BOX_PAD_Y + (vh - nh * nextScale) / 2),
    };
  };

  const applyActualSize = () => {
    const { w, h } = measureNatural();
    const pos = centerActual(w, h);
    setFitted(false);
    setScale(1);
    setTx(pos.tx);
    setTy(pos.ty);
  };

  const applyFitToScreen = () => {
    const { w, h } = measureNatural();
    const next = computeFit(w, h);
    setFitted(true);
    setScale(next.scale);
    setTx(next.tx);
    setTy(next.ty);
  };

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const stage = stageRef.current;
    if (!vp || !stage) return;

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { w, h } = measureNatural();
        if (viewRef.current.fitted) {
          const next = computeFit(w, h);
          setScale(next.scale);
          setTx(next.tx);
          setTy(next.ty);
        } else if (
          viewRef.current.scale === 1 &&
          viewRef.current.tx === 0 &&
          viewRef.current.ty === 0
        ) {
          const pos = centerActual(w, h);
          setTx(pos.tx);
          setTy(pos.ty);
        }
      });
    };

    const boot = requestAnimationFrame(() => requestAnimationFrame(sync));
    const ro = new ResizeObserver(sync);
    ro.observe(vp);
    ro.observe(stage);
    return () => {
      cancelAnimationFrame(boot);
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [root]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const drag = dragRef.current;
    drag.active = true;
    drag.moved = false;
    drag.pointerId = e.pointerId;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.origTx = tx;
    drag.origTy = ty;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (
      !drag.moved &&
      (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
    ) {
      drag.moved = true;
      suppressClickRef.current = true;
    }
    if (!drag.moved) return;
    setTx(drag.origTx + dx);
    setTy(drag.origTy + dy);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    drag.active = false;
    setDragging(false);
    if (drag.moved) {
      suppressClickRef.current = true;
      if (fitted) setFitted(false);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClickRef.current = false;
  };

  return (
    <div className="org-graph-shell relative w-full min-w-0">
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
        <p className="hidden sm:block text-[11px] text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded-md border">
          Drag to pan
        </p>
        <Button
          type="button"
          size="sm"
          variant={fitted ? "secondary" : "outline"}
          className="shadow-sm bg-background"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (fitted) applyActualSize();
            else applyFitToScreen();
          }}
        >
          {fitted ? "Actual size" : "Fit to screen"}
        </Button>
      </div>
      <div
        ref={viewportRef}
        className={cn(
          "org-graph-box w-full min-w-0 overflow-hidden box-border touch-none select-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          minHeight: VIEW_MIN_H,
          height: "min(70vh, 720px)",
          padding: 0,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        <div
          ref={stageRef}
          className="w-max will-change-transform"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <div className="org-chart">
            <ul className="org-children is-root">
              <OrgBranch
                node={root}
                depth={0}
                currentUserId={currentUserId}
                showTrainerBadge={showTrainerBadge}
              />
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const REPORTING_SCOPE_BLURB: Record<OrgScope, string> = {
  company: "Full company reporting graph.",
  team: "Managers above you, peer leads at your level (without their teams), and your own reports.",
  peers: "Managers above you and teammates at your level.",
};

const TRAINING_SCOPE_BLURB: Record<TrainerScope, string> = {
  company: "Full company trainer–trainee graph.",
  mine: "Your trainees, plus your trainer above you if assigned.",
  cohort: "Your trainer and fellow trainees under the same trainer.",
};

function normalizeTree(raw: unknown): OrgNode[] {
  if (!Array.isArray(raw)) return [];
  return raw as OrgNode[];
}

export default function OrgHierarchyPage() {
  const token = useAuthStore((s) => s.token);
  const currentUserId = token?.id ? String(token.id) : null;

  const [mode, setMode] = useState<HierarchyMode>("reporting");
  const [canViewTraining, setCanViewTraining] = useState(false);

  const [reportingTree, setReportingTree] = useState<OrgNode[]>([]);
  const [trainingTree, setTrainingTree] = useState<OrgNode[]>([]);

  const [reportingStats, setReportingStats] = useState({
    total: 0,
    linked: 0,
  });
  const [trainingStats, setTrainingStats] = useState({ total: 0, linked: 0 });

  const [reportingScope, setReportingScope] = useState<OrgScope>("company");
  const [trainingScope, setTrainingScope] = useState<TrainerScope>("company");

  const [viewerHasReportingManager, setViewerHasReportingManager] =
    useState(true);
  const [viewerHasReports, setViewerHasReports] = useState(true);
  const [viewerHasTrainer, setViewerHasTrainer] = useState(false);
  const [viewerHasTrainees, setViewerHasTrainees] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportingResult, trainingSettled] = await Promise.all([
        axios.get("/api/employee/org-hierarchy"),
        axios
          .get("/api/employee/trainer-hierarchy")
          .then((res) => ({ ok: true as const, res }))
          .catch((err: unknown) => ({ ok: false as const, err })),
      ]);

      const reporting = reportingResult.data?.data ?? {};
      setReportingTree(normalizeTree(reporting.tree));
      setReportingStats({
        total: Number(reporting.totalEmployees || 0),
        linked: Number(reporting.withManager || 0),
      });
      const rawReportingScope = String(reporting.scope || "company");
      setReportingScope(
        rawReportingScope === "team" ||
          rawReportingScope === "peers" ||
          rawReportingScope === "company"
          ? rawReportingScope
          : "company",
      );
      setViewerHasReportingManager(
        reporting.viewerHasReportingManager === true,
      );
      setViewerHasReports(reporting.viewerHasReports === true);

      if (trainingSettled.ok) {
        const training = trainingSettled.res.data?.data ?? {};
        const allowTraining = training.canViewTraining === true;
        setCanViewTraining(allowTraining);
        setTrainingTree(allowTraining ? normalizeTree(training.tree) : []);
        setTrainingStats({
          total: Number(training.totalEmployees || 0),
          linked: Number(training.withTrainer || 0),
        });
        const rawTrainingScope = String(training.scope || "company");
        setTrainingScope(
          rawTrainingScope === "mine" ||
            rawTrainingScope === "cohort" ||
            rawTrainingScope === "company"
            ? rawTrainingScope
            : "company",
        );
        setViewerHasTrainer(training.viewerHasTrainer === true);
        setViewerHasTrainees(training.viewerHasTrainees === true);
        if (!allowTraining) setMode("reporting");
      }
      // Transport/5xx: keep prior canViewTraining so entitled users keep the toggle.
    } catch {
      setError("Could not load hierarchy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isTraining = mode === "training" && canViewTraining;
  const tree = isTraining ? trainingTree : reportingTree;
  const scope = isTraining ? trainingScope : reportingScope;
  const stats = isTraining ? trainingStats : reportingStats;

  const { chartRoots, unassigned } = useMemo(() => {
    const withKids = tree.filter((n) => n.children.length > 0);
    const alone = tree.filter((n) => n.children.length === 0);
    return { chartRoots: withKids, unassigned: alone };
  }, [tree]);

  const blurb = (() => {
    if (isTraining) {
      if (trainingScope === "cohort" && !viewerHasTrainer) {
        return "No trainer is set on your profile yet.";
      }
      if (trainingScope === "mine" && !viewerHasTrainees) {
        return "Nobody is assigned to you as trainees yet.";
      }
      return TRAINING_SCOPE_BLURB[trainingScope];
    }
    if (reportingScope === "peers" && !viewerHasReportingManager) {
      return "No reporting manager is set on your profile yet.";
    }
    if (reportingScope === "team" && !viewerHasReports) {
      return "You are marked as a reporting manager, but nobody reports to you yet.";
    }
    return REPORTING_SCOPE_BLURB[reportingScope];
  })();

  const statsLine = (() => {
    if (isTraining) {
      if (trainingScope === "company") {
        return `${stats.linked} of ${stats.total} active employees have a trainer.`;
      }
      if (trainingScope === "cohort" && !viewerHasTrainer) {
        return "Showing only you. Ask HR to assign your trainer to join a training graph.";
      }
      if (trainingScope === "mine" && !viewerHasTrainees) {
        return "Showing only you until trainees are linked to you.";
      }
      return `${stats.total} people in this view.`;
    }
    if (reportingScope === "company") {
      return `${stats.linked} of ${stats.total} active employees have a reporting manager.`;
    }
    if (reportingScope === "peers" && !viewerHasReportingManager) {
      return "Showing only you. Ask HR to assign your reporting manager to join a team graph.";
    }
    if (reportingScope === "team" && !viewerHasReports) {
      return "Showing only you until reports are linked to you.";
    }
    return `${stats.total} people in this view.`;
  })();

  const emptyChartMessage = (() => {
    if (isTraining) {
      if (trainingScope === "company") {
        return "No trainer lines yet. Assign trainers during candidate select / employee create to build the graph.";
      }
      if (trainingScope === "cohort" && !viewerHasTrainer) {
        return "You have no trainer in the hierarchy until one is assigned.";
      }
      return "No training tree to draw yet.";
    }
    if (reportingScope === "company") {
      return "No reporting lines yet. Assign reporting managers on employee edit to build the graph.";
    }
    if (reportingScope === "peers" && !viewerHasReportingManager) {
      return "You have no parent in the hierarchy until a reporting manager is assigned.";
    }
    return "No team tree to draw yet.";
  })();

  const unassignedHeading = (() => {
    if (
      scope !== "company" &&
      unassigned.length === 1 &&
      chartRoots.length === 0
    ) {
      return "You";
    }
    return isTraining
      ? `No trainer assigned yet (${unassigned.length})`
      : `No reporting line yet (${unassigned.length})`;
  })();

  return (
    <div className="px-4 py-6 w-full min-w-0 max-w-[100vw] overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 max-w-6xl mx-auto">
        <div>
          <div className="h-0.5 w-8 bg-primary mb-2 rounded-full" />
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-muted-foreground font-medium">TEAM</span>{" "}
            <span className="text-primary">HIERARCHY</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{blurb}</p>
          {canViewTraining ? (
            <div
              className="mt-3 inline-flex rounded-lg border bg-muted/40 p-0.5"
              role="tablist"
              aria-label="Hierarchy view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "reporting"}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  mode === "reporting"
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMode("reporting")}
              >
                Reporting
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "training"}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  mode === "training"
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMode("training")}
              >
                Training
              </button>
            </div>
          ) : null}
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {!loading && !error ? (
        <p className="text-sm text-muted-foreground mb-4 max-w-6xl mx-auto">
          {statsLine}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <InfinityLoader className="w-16 h-12" />
        </div>
      ) : error ? (
        <p className="text-destructive text-sm max-w-6xl mx-auto">{error}</p>
      ) : chartRoots.length === 0 && unassigned.length === 0 ? (
        <p className="text-sm text-muted-foreground max-w-6xl mx-auto">
          No active employees found.
        </p>
      ) : (
        <div className="space-y-10 w-full min-w-0">
          {chartRoots.length === 0 ? (
            <p className="text-sm text-muted-foreground max-w-6xl mx-auto">
              {emptyChartMessage}
            </p>
          ) : (
            chartRoots.map((root) => (
              <div
                key={`${isTraining ? "t" : "r"}-${root.id}`}
                className="w-full min-w-0 rounded-xl border bg-background shadow-sm overflow-hidden"
              >
                <OrgTree
                  root={root}
                  currentUserId={currentUserId}
                  showTrainerBadge={isTraining}
                />
              </div>
            ))
          )}

          {unassigned.length > 0 ? (
            <div className="w-full min-w-0 max-w-6xl mx-auto">
              <h2 className="text-sm font-semibold mb-4 text-muted-foreground">
                {unassignedHeading}
              </h2>
              <div className="flex flex-wrap gap-6 justify-start">
                {unassigned.map((node) => (
                  <UnassignedCard
                    key={node.id}
                    node={node}
                    currentUserId={currentUserId}
                    showTrainerBadge={isTraining}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <style jsx global>{`
        .org-chart {
          width: max-content;
          margin-inline: auto;
          padding: 0.25rem 0 0.5rem;
          box-sizing: border-box;
        }

        .org-children {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          list-style: none;
          margin: 0;
          padding: ${STEM}px 0 0;
          position: relative;
          width: max-content;
          gap: 0;
        }

        .org-children.is-root {
          padding-top: 0;
        }

        .org-children:not(.is-root)::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          height: ${HALF}px;
          width: 0;
          border-left: 2px solid ${LINE};
          transform: translateX(-1px);
          z-index: 0;
        }

        .org-li {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 0 0 auto;
          min-width: 0;
          padding: 0 4px;
          box-sizing: border-box;
        }

        .org-children.is-root > .org-li {
          flex: 0 0 auto;
          min-width: 0;
          width: auto;
        }

        .org-card {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          width: auto;
          flex-shrink: 0;
        }

        .org-children:not(.is-root) > .org-li::before {
          content: "";
          position: absolute;
          top: -${HALF}px;
          left: 50%;
          height: ${HALF}px;
          width: 0;
          border-left: 2px solid ${LINE};
          transform: translateX(-1px);
          z-index: 0;
        }

        .org-children:not(.is-root) > .org-li::after {
          content: "";
          position: absolute;
          top: -${HALF}px;
          left: 0;
          width: 100%;
          height: 0;
          border-top: 2px solid ${LINE};
          z-index: 0;
        }

        .org-children:not(.is-root) > .org-li:first-child:not(:only-child)::after {
          left: 50%;
          width: 50%;
        }

        .org-children:not(.is-root) > .org-li:last-child:not(:only-child)::after {
          left: 0;
          width: 50%;
        }

        .org-children:not(.is-root) > .org-li:only-child::after {
          display: none;
        }

        .org-children.is-single:not(.is-root)::before {
          height: ${STEM}px;
        }
        .org-children.is-single:not(.is-root) > .org-li::before {
          top: -${STEM}px;
          height: ${STEM}px;
        }

        .org-children:not(.is-root) > .org-li > .org-card::before {
          content: "";
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${LINE};
          z-index: 3;
        }
      `}</style>
    </div>
  );
}
