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

const YOU = "#1d5fbf";
const LINE = "#c8c8c8";
/** Full gap parent → child. Fork sits at STEM/2 (classic T-junction). */
const STEM = 36;
const HALF = STEM / 2;
const AVATAR = 40;
const CARD_W = 148;
/** Padding inside the dedicated graph box (each side). */
const BOX_PAD_X = 16;
const BOX_PAD_Y = 16;
const VIEW_MIN_H = 420;
const DRAG_THRESHOLD = 4;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ node, you }: { node: OrgNode; you: boolean }) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full bg-[#eef1f4] dark:bg-muted",
        you ? "ring-2 ring-[#1d5fbf] ring-offset-2 ring-offset-white dark:ring-offset-card" : "ring-1 ring-[#e8e8e8] dark:ring-border",
      )}
      style={{ width: AVATAR, height: AVATAR }}
    >
      {node.profilePic ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.profilePic} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[#111] dark:text-foreground">
          {initials(node.name) || "?"}
        </div>
      )}
    </div>
  );
}

function PersonCard({
  node,
  currentUserId,
  showTrainerBadge,
}: {
  node: OrgNode;
  currentUserId: string | null;
  showTrainerBadge?: boolean;
}) {
  const title = node.jobTitle || node.role || "Employee";
  const isYou = Boolean(currentUserId && node.id === currentUserId);
  const trainerBadge = showTrainerBadge && node.isTrainer === true;

  return (
    <Link
      href={`/dashboard/employeedetails/${node.id}`}
      className="org-person relative z-[2] mx-auto flex flex-col items-center rounded-lg border border-[#e8e8e8] bg-white px-3 py-3 text-center no-underline hover:border-[#bdbdbd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d5fbf] dark:border-border dark:bg-card dark:hover:border-muted-foreground"
      style={{ width: CARD_W }}
      title={`${node.name} · ${title}`}
    >
      <Avatar node={node} you={isYou} />
      <p className="mt-2 w-full truncate text-sm font-medium leading-tight text-[#111] dark:text-foreground">
        {node.name}
      </p>
      <p className="mt-0.5 w-full truncate text-xs leading-tight text-[#5f6368] dark:text-muted-foreground">
        {title}
      </p>
      {isYou ? (
        <p className="mt-1 text-xs font-medium leading-tight" style={{ color: YOU }}>
          You
        </p>
      ) : null}
      {trainerBadge ? (
        <p className="mt-1 text-xs leading-tight text-[#111] dark:text-foreground">Trainer</p>
      ) : null}
    </Link>
  );
}

function OrgBranch({
  node,
  currentUserId,
  showTrainerBadge,
}: {
  node: OrgNode;
  currentUserId: string | null;
  showTrainerBadge?: boolean;
}) {
  const kids = node.children;
  const hasKids = kids.length > 0;

  return (
    <li className="org-li">
      <div className="org-card">
        <PersonCard
          node={node}
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e8e8] px-4 py-3 dark:border-border">
        <h2 className="min-w-0 truncate text-base font-medium text-[#111] dark:text-foreground">
          {root.name}
          <span className="font-normal text-[#5f6368] dark:text-muted-foreground">
            {" "}
            · {root.jobTitle || root.role || "Employee"}
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-[#5f6368] sm:block dark:text-muted-foreground">Drag to move</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="bg-white dark:bg-card"
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
  const stats = isTraining ? trainingStats : reportingStats;

  const { chartRoots, unassigned } = useMemo(() => {
    const withKids = tree.filter((n) => n.children.length > 0);
    const alone = tree.filter((n) => n.children.length === 0);
    return { chartRoots: withKids, unassigned: alone };
  }, [tree]);

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

  const unassignedHeading = isTraining
    ? `No trainer assigned yet (${unassigned.length})`
    : `No reporting line yet (${unassigned.length})`;

  return (
    <div className="min-w-0 overflow-x-hidden bg-[#f2f4f7] px-4 py-6 text-[#111] dark:bg-background dark:text-foreground md:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Team hierarchy</h1>
          {!loading && !error ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5f6368] dark:text-muted-foreground">
              {statsLine}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#5f6368] dark:text-muted-foreground">
              Who reports to whom, and who trains whom.
            </p>
          )}
          {canViewTraining ? (
            <div
              className="mt-3 inline-flex rounded-md border border-[#e8e8e8] bg-white p-0.5 dark:border-border dark:bg-card"
              role="tablist"
              aria-label="Hierarchy view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "reporting"}
                className={cn(
                  "min-h-9 rounded px-3 text-sm",
                  mode === "reporting"
                    ? "bg-[#f2f4f7] font-medium text-[#111] dark:bg-muted dark:text-foreground"
                    : "text-[#5f6368] hover:text-[#111] dark:text-muted-foreground",
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
                  "min-h-9 rounded px-3 text-sm",
                  mode === "training"
                    ? "bg-[#f2f4f7] font-medium text-[#111] dark:bg-muted dark:text-foreground"
                    : "text-[#5f6368] hover:text-[#111] dark:text-muted-foreground",
                )}
                onClick={() => setMode("training")}
              >
                Training
              </button>
            </div>
          ) : null}
        </div>
        <Button variant="outline" className="bg-white dark:bg-card" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-[#e8e8e8] bg-white px-4 py-10 dark:border-border dark:bg-card" aria-busy="true">
          <div className="mx-auto flex w-fit flex-col items-center gap-6">
            <div className="h-[88px] w-[148px] rounded-lg bg-[#e6e8eb] dark:bg-muted" />
            <div className="h-px w-40 bg-[#e6e8eb] dark:bg-muted" />
            <div className="flex gap-4">
              <div className="h-[88px] w-[148px] rounded-lg bg-[#e6e8eb] dark:bg-muted" />
              <div className="h-[88px] w-[148px] rounded-lg bg-[#e6e8eb] dark:bg-muted" />
              <div className="h-[88px] w-[148px] rounded-lg bg-[#e6e8eb] dark:bg-muted" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#e8e8e8] bg-white px-4 py-8 dark:border-border dark:bg-card">
          <p className="text-sm text-[#111] dark:text-foreground">{error}</p>
          <Button variant="outline" className="mt-3 bg-white dark:bg-card" onClick={load}>
            Retry
          </Button>
        </div>
      ) : chartRoots.length === 0 && unassigned.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d0d0d0] bg-white px-4 py-8 dark:border-border dark:bg-card">
          <p className="text-sm text-[#5f6368] dark:text-muted-foreground">No active employees found.</p>
        </div>
      ) : (
        <div className="w-full min-w-0 space-y-4">
          {chartRoots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d0d0d0] bg-white px-4 py-8 dark:border-border dark:bg-card">
              <p className="text-sm text-[#5f6368] dark:text-muted-foreground">{emptyChartMessage}</p>
            </div>
          ) : (
            chartRoots.map((root) => (
              <div
                key={`${isTraining ? "t" : "r"}-${root.id}`}
                className="w-full min-w-0 overflow-hidden rounded-lg border border-[#e8e8e8] bg-white dark:border-border dark:bg-card"
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
            <section className="w-full min-w-0 rounded-lg border border-[#e8e8e8] bg-white px-4 py-4 dark:border-border dark:bg-card">
              <h2 className="text-base font-medium text-[#111] dark:text-foreground">{unassignedHeading}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {unassigned.map((node) => (
                  <PersonCard
                    key={node.id}
                    node={node}
                    currentUserId={currentUserId}
                    showTrainerBadge={isTraining}
                  />
                ))}
              </div>
            </section>
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
          border-left: 1px solid ${LINE};
          transform: translateX(-0.5px);
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
          border-left: 1px solid ${LINE};
          transform: translateX(-0.5px);
          z-index: 0;
        }

        .org-children:not(.is-root) > .org-li::after {
          content: "";
          position: absolute;
          top: -${HALF}px;
          left: 0;
          width: 100%;
          height: 0;
          border-top: 1px solid ${LINE};
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

      `}</style>
    </div>
  );
}
