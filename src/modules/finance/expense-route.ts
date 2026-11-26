import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
  type FinanceAuthPayload,
} from "@/modules/finance/access";
import { ExpenseError } from "@/modules/finance/services/expense-sheet.service";
import { EmployeeSalaryError } from "@/modules/finance/services/salary.service";

/** Auth, database connection and error mapping shared by the expense API routes. */
export async function runExpenseRoute(
  request: NextRequest,
  label: string,
  failureMessage: string,
  handler: (actor: FinanceAuthPayload) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const actor = await requireFinanceAccess(request);
    await connectDb();
    return await handler(actor);
  } catch (error) {
    if (error instanceof ExpenseError || error instanceof EmployeeSalaryError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    console.error(label, error);
    return NextResponse.json({ success: false, message: failureMessage }, { status: 500 });
  }
}

export type ParsedBody<S extends z.ZodTypeAny> =
  | { ok: true; data: z.infer<S> }
  | { ok: false; response: NextResponse };

function invalid(message: string, errors?: unknown): NextResponse {
  return NextResponse.json({ success: false, message, errors }, { status: 400 });
}

export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: NextRequest,
  schema: S,
): Promise<ParsedBody<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: invalid("Send a valid JSON body") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return { ok: false, response: invalid(first ?? "Check the values and try again", parsed.error.flatten()) };
  }
  return { ok: true, data: parsed.data };
}
