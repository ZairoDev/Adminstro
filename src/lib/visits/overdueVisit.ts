import type { VisitScheduleSlot, VisitStatus } from "@/lib/visits/visitStatus";

export interface OverdueVisitSummary {
  _id: string;
  VSID: string;
  ownerName: string;
  ownerPhone: string;
  visitType: string;
  agentName: string;
  agentPhone: string;
  visitStatus: VisitStatus;
  schedule: VisitScheduleSlot[];
  createdBy: string;
  daysOverdue: number;
  lead?: {
    _id: string;
    name: string;
    phoneNo: string | number;
  };
}
