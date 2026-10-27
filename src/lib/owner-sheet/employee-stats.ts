export type OwnerSheetKind = "all" | "long-term" | "short-term";

export interface OwnerSheetLocationCount {
  location: string;
  count: number;
}

export interface OwnerSheetEmployeeStat {
  employeeId: string;
  name: string;
  email: string;
  total: number;
  locations: OwnerSheetLocationCount[];
}

export interface OwnerSheetDailyPoint {
  date: string;
  [employeeId: string]: string | number;
}

export interface OwnerSheetEmployeeStats {
  from: string;
  to: string;
  location: string;
  sheet: OwnerSheetKind;
  locations: string[];
  employees: OwnerSheetEmployeeStat[];
  chartEmployees: OwnerSheetEmployeeStat[];
  series: OwnerSheetDailyPoint[];
  unattributed: number;
  total: number;
}
