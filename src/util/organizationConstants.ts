import { z } from "zod";

export const ORGANIZATIONS = ["VacationSaga", "Holidaysera"] as const;
export type Organization = (typeof ORGANIZATIONS)[number];

export const OrganizationZod = z.enum(ORGANIZATIONS);

export const DEFAULT_ORGANIZATION: Organization = "VacationSaga";

