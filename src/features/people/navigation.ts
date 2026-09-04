export const PEOPLE_LIST_TABS = [
  "pipeline",
  "interview",
  "shortlisted",
  "selected",
  "rejected",
  "onboarding",
  "active",
  "exited",
] as const;

export type PeopleListTab = (typeof PEOPLE_LIST_TABS)[number];

export const PERSON_TABS = [
  "overview",
  "pipeline",
  "documents",
  "employment",
  "performance",
  "history",
] as const;

export type PersonTab = (typeof PERSON_TABS)[number];

export type HiringSubpath = "offer-letter" | "onboarding" | "training-agreement";

export interface PeopleListQuery {
  tab: PeopleListTab;
  search: string;
  page: number;
  role: string;
  experience: string;
  date: string;
  from?: string;
  to?: string;
}

const PEOPLE_LAST_LIST_STORAGE_KEY = "people:lastList";
const PEOPLE_LIST_TAB_SET = new Set<string>(PEOPLE_LIST_TABS);
const PERSON_TAB_SET = new Set<string>(PERSON_TABS);

function isPeopleListTab(value: string | null | undefined): value is PeopleListTab {
  return Boolean(value && PEOPLE_LIST_TAB_SET.has(value));
}

function isPersonTab(value: string | null | undefined): value is PersonTab {
  return Boolean(value && PERSON_TAB_SET.has(value));
}

function pathOnly(href: string): string {
  return href.split("?")[0]?.split("#")[0] ?? href;
}

/**
 * Accept only same-app dashboard paths. Rejects protocol URLs, protocol-relative
 * URLs, and the deleted candidate-portal list route.
 */
export function parseDashboardPath(
  returnTo: string | null | undefined
): string | null {
  if (!returnTo) return null;

  let value = returnTo.trim();
  if (!value) return null;

  try {
    value = decodeURIComponent(value);
  } catch {
    // already decoded or malformed — use the raw string
  }

  value = value.trim();
  if (!value.startsWith("/dashboard/")) return null;
  if (value.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  if (value.includes("\\")) return null;

  const pathname = pathOnly(value);
  if (pathname === "/dashboard/candidatePortal" || pathname === "/dashboard/candidatePortal/") {
    return null;
  }

  return value;
}

export function safeDashboardPath(
  returnTo: string | null | undefined,
  fallback: string
): string {
  return parseDashboardPath(returnTo) ?? fallback;
}

export function withReturnTo(href: string, returnTo?: string | null): string {
  const safe = parseDashboardPath(returnTo);
  if (!safe) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(safe)}`;
}

export function parsePeopleListQuery(
  searchParams: Pick<URLSearchParams, "get">
): PeopleListQuery {
  const tabRaw = searchParams.get("tab");
  const pageRaw = Number(searchParams.get("page"));
  const date = searchParams.get("date") || "all";

  const query: PeopleListQuery = {
    tab: isPeopleListTab(tabRaw) ? tabRaw : "pipeline",
    search: searchParams.get("search")?.trim() ?? "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
    role: searchParams.get("role") || "all",
    experience: searchParams.get("experience") || "all",
    date,
  };

  if (date === "custom") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from) query.from = from;
    if (to) query.to = to;
  }

  return query;
}

export function peopleListPath(query?: Partial<PeopleListQuery>): string {
  const params = new URLSearchParams();
  const tab = query?.tab ?? "pipeline";
  const search = query?.search?.trim() ?? "";
  const page = query?.page && query.page > 1 ? query.page : 1;
  const role = query?.role && query.role !== "all" ? query.role : "all";
  const experience =
    query?.experience && query.experience !== "all" ? query.experience : "all";
  const date = query?.date && query.date !== "all" ? query.date : "all";

  if (tab !== "pipeline") params.set("tab", tab);
  if (search) params.set("search", search);
  if (page > 1) params.set("page", String(page));
  if (role !== "all") params.set("role", role);
  if (experience !== "all") params.set("experience", experience);
  if (date !== "all") params.set("date", date);
  if (date === "custom") {
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
  }

  const qs = params.toString();
  return qs ? `/dashboard/people?${qs}` : "/dashboard/people";
}

export function personPath(
  candidateId: string,
  options?: { returnTo?: string | null; tab?: PersonTab | null }
): string {
  const params = new URLSearchParams();
  const returnTo = parseDashboardPath(options?.returnTo);
  if (returnTo) params.set("returnTo", returnTo);
  if (options?.tab && options.tab !== "overview" && isPersonTab(options.tab)) {
    params.set("tab", options.tab);
  }
  const qs = params.toString();
  return qs
    ? `/dashboard/people/${candidateId}?${qs}`
    : `/dashboard/people/${candidateId}`;
}

export function parsePersonTab(
  value: string | null | undefined
): PersonTab | null {
  return isPersonTab(value) ? value : null;
}

export function hiringWorkspacePath(
  candidateId: string,
  options?: { subpath?: HiringSubpath; returnTo?: string | null }
): string {
  const suffix = options?.subpath ? `/${options.subpath}` : "";
  return withReturnTo(
    `/dashboard/candidatePortal/${candidateId}${suffix}`,
    options?.returnTo
  );
}

export function employeePath(
  employeeId: string,
  returnTo?: string | null
): string {
  return withReturnTo(`/dashboard/employeedetails/${employeeId}`, returnTo);
}

export function hiringBackLabel(returnTo: string): string {
  const pathname = pathOnly(returnTo);
  if (pathname === "/dashboard/people") return "Back to People";
  if (pathname.startsWith("/dashboard/employeedetails")) return "Back to employee";
  if (pathname.startsWith("/dashboard/people/")) return "Back to profile";
  return "Back to profile";
}

export function rememberPeopleListUrl(url: string): void {
  if (typeof window === "undefined") return;
  const safe = parseDashboardPath(url);
  if (!safe) return;
  if (pathOnly(safe) !== "/dashboard/people") return;
  try {
    sessionStorage.setItem(PEOPLE_LAST_LIST_STORAGE_KEY, safe);
  } catch {
    // private mode / disabled storage
  }
}

export function readRememberedPeopleListUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return parseDashboardPath(
      sessionStorage.getItem(PEOPLE_LAST_LIST_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}
