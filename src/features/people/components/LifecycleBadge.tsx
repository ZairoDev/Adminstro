import { Badge } from "@/components/ui/badge";
import type { LifecyclePhase } from "@/lib/people/lifecycle";

const PHASE_STYLES: Record<LifecyclePhase, string> = {
  applicant: "border-amber-200 bg-amber-50 text-amber-800",
  onboarding: "border-purple-200 bg-purple-50 text-purple-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  exited: "border-slate-300 bg-slate-100 text-slate-800",
};

const PHASE_LABELS: Record<LifecyclePhase, string> = {
  applicant: "Pipeline",
  onboarding: "Onboarding",
  active: "Active",
  exited: "Exited",
};

export function LifecycleBadge({ phase }: { phase: LifecyclePhase }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium ${PHASE_STYLES[phase]}`}>
      {PHASE_LABELS[phase]}
    </Badge>
  );
}
