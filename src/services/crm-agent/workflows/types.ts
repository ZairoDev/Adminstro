export type CrmAgentMode = "ask" | "agent";

export type WorkflowId =
  | "apply_disposition"
  | "set_reminder"
  | "report_my_team_today";

export type WorkflowStatus =
  | "collecting"
  | "awaiting_confirm"
  | "done"
  | "cancelled";

export type DispositionAction = "good_to_go" | "reject_lead" | "decline_lead";

export type ActiveWorkflow = {
  workflowId: WorkflowId;
  status: WorkflowStatus;
  slots: Record<string, unknown>;
  missing: string[];
  preview?: Record<string, unknown>;
  startedAt: string;
};

export type UiChoiceOption = { label: string; value: string };

export type CrmAgentUi =
  | {
      type: "choices";
      id: string;
      prompt: string;
      options: UiChoiceOption[];
    }
  | {
      type: "plan";
      title: string;
      lines: string[];
      confirmLabel: string;
    }
  | {
      type: "report";
      title: string;
      metrics: Array<{
        label: string;
        value: string | number;
        href?: string;
      }>;
    };

export type WorkflowStepResult = {
  answer: string;
  activeWorkflow: ActiveWorkflow | null;
  ui?: CrmAgentUi;
  done?: boolean;
  reportOnly?: boolean;
};
