import { isSalesTeamRestricted } from "@/util/apiSecurity";
import { VisitAccessError } from "@/lib/visits/visitStatus";

export interface VisitActor {
  email: string;
  role: string;
}

export interface VisitAccessRecord {
  createdBy?: string;
}

export function assertCanAccessVisit(
  visit: VisitAccessRecord,
  actor: VisitActor,
): void {
  if (!isSalesTeamRestricted(actor.role)) return;

  if (!actor.email || visit.createdBy !== actor.email) {
    throw new VisitAccessError();
  }
}
