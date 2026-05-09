/** Shared types for the monthly-target gate/modal boundary. */
export interface MonthlyTargetRow {
  city: string;
  cityKey: string;
  leads: number;
  visits: number;
  sales: number;
  leadsConfigured: boolean;
  visitsConfigured: boolean;
  salesConfigured: boolean;
  month: number;
  year: number;
}
