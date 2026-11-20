"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  currentPayrollMonth,
  daysInPayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";
import { alternateSaturdayOffDates } from "@/modules/attendance/dates";
import type {
  DepartmentOption,
  DepartmentShiftPositionView,
  DepartmentShiftView,
  HolidayView,
  PolicyView,
  ShiftView,
} from "@/modules/attendance/view";
import {
  FinanceSheetError,
  FinanceSheetSkeleton,
  sheetFrameClass,
  sheetScrollClass,
  sheetToolbarClass,
} from "../../finance/_components/finance-sheet-frame";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDayMonth(dateKey: string): string {
  const day = Number(dateKey.slice(-2));
  const month = Number(dateKey.slice(5, 7));
  const label = new Date(Date.UTC(2000, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });
  return `${day} ${label}`;
}

function alternateSaturdayPreview(pattern: "cycle_a" | "cycle_b", monthKey: string): string {
  const days = daysInPayrollMonth({
    year: Number(monthKey.slice(0, 4)),
    month: Number(monthKey.slice(5, 7)),
    key: monthKey,
  });
  const offs = alternateSaturdayOffDates(`${monthKey}-01`, `${monthKey}-${String(days).padStart(2, "0")}`, pattern);
  if (offs.length === 0) return "no Saturdays off this month";
  return `off ${offs.map(formatDayMonth).join(", ")}`;
}

type PolicyResponse = { policy: PolicyView; departments: DepartmentOption[] };

export default function AttendanceSettingsClient() {
  const month = currentPayrollMonth();
  const [policy, setPolicy] = useState<PolicyView | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [holidays, setHolidays] = useState<HolidayView[]>([]);
  const [shifts, setShifts] = useState<ShiftView[]>([]);
  const [departmentShifts, setDepartmentShifts] = useState<DepartmentShiftView[]>([]);
  const [shiftSavingKey, setShiftSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDepartment, setHolidayDepartment] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [shiftStart, setShiftStart] = useState("22:00");
  const [shiftEnd, setShiftEnd] = useState("06:00");
  const [shiftFrom, setShiftFrom] = useState("");
  const [shiftTo, setShiftTo] = useState("");
  const [shiftOffs, setShiftOffs] = useState<number[]>([0]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [policyResponse, holidayResponse, shiftResponse, departmentShiftResponse] = await Promise.all([
        axios.get<{ success: boolean; data: PolicyResponse }>("/api/attendance/policy"),
        axios.get<{ success: boolean; data: HolidayView[] }>("/api/attendance/holidays"),
        axios.get<{ success: boolean; data: ShiftView[] }>("/api/attendance/shifts"),
        axios.get<{ success: boolean; data: DepartmentShiftView[] }>("/api/attendance/department-shifts"),
      ]);
      setPolicy(policyResponse.data.data.policy);
      setDepartments(policyResponse.data.data.departments);
      setHolidays(holidayResponse.data.data);
      setShifts(shiftResponse.data.data);
      setDepartmentShifts(departmentShiftResponse.data.data);
    } catch (loadError) {
      const text =
        axios.isAxiosError(loadError) &&
        typeof loadError.response?.data === "object" &&
        loadError.response.data !== null &&
        "message" in loadError.response.data &&
        typeof loadError.response.data.message === "string"
          ? loadError.response.data.message
          : "Could not load attendance settings";
      setError(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePolicy = async () => {
    if (!policy) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put<{ success: boolean; data: PolicyView }>("/api/attendance/policy", {
        policyName: policy.policyName,
        shiftStart: policy.shiftStart,
        shiftEnd: policy.shiftEnd,
        graceMinutes: Number(policy.graceMinutes),
        weeklyOffDays: policy.weeklyOffDays,
        alternateSaturdayOff: policy.alternateSaturdayOff,
        halfDayLopFactor: Number(policy.halfDayLopFactor),
        lateCreatesLop: policy.lateCreatesLop,
        lateLopFactor: Number(policy.lateLopFactor),
        lateGraceThresholdCount: Number(policy.lateGraceThresholdCount),
        severeLateMinutes: Number(policy.severeLateMinutes),
        cutoffTime: policy.cutoffTime,
        confirmed: policy.confirmed,
        paidLeaveMonthlyAccrual: Number(policy.paidLeaveMonthlyAccrual),
        paidLeaveCarryForwardCap: Number(policy.paidLeaveCarryForwardCap),
        paidLeaveMaxBalance: Number(policy.paidLeaveMaxBalance),
        unplannedLeaveLopDays: Number(policy.unplannedLeaveLopDays),
        plannedLeaveMinNoticeDays: Number(policy.plannedLeaveMinNoticeDays),
        unplannedBackdateDays: Number(policy.unplannedBackdateDays),
      });
      setPolicy(response.data.data);
      setMessage(response.data.data.confirmed
        ? "Policy saved. Missing logins after cutoff are now unapproved leave."
        : "Policy saved. Missing logins stay pending until you confirm it.");
    } catch (saveError) {
      setMessage(errorMessage(saveError, "Could not save the policy"));
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async () => {
    setMessage(null);
    try {
      await axios.post("/api/attendance/holidays", {
        date: holidayDate,
        name: holidayName,
        departmentId: holidayDepartment || null,
      });
      setHolidayDate("");
      setHolidayName("");
      setHolidayDepartment("");
      await load();
    } catch (saveError) {
      setMessage(errorMessage(saveError, "Could not add the holiday"));
    }
  };

  const addShift = async () => {
    setMessage(null);
    try {
      await axios.post("/api/attendance/shifts", {
        employeeCode: shiftCode,
        startTime: shiftStart,
        endTime: shiftEnd,
        weeklyOffDays: shiftOffs,
        effectiveFrom: shiftFrom,
        effectiveTo: shiftTo || null,
      });
      setShiftCode("");
      await load();
    } catch (saveError) {
      setMessage(errorMessage(saveError, "Could not save the shift"));
    }
  };

  const updateDepartmentShift = (departmentId: string, patch: Partial<DepartmentShiftView>) => {
    setDepartmentShifts((current) =>
      current.map((item) => (item.departmentId === departmentId ? { ...item, ...patch } : item)),
    );
  };

  const updatePositionShift = (
    departmentId: string,
    jobPositionId: string,
    patch: Partial<DepartmentShiftPositionView>,
  ) => {
    setDepartmentShifts((current) =>
      current.map((item) =>
        item.departmentId === departmentId
          ? {
              ...item,
              positions: item.positions.map((position) =>
                position.jobPositionId === jobPositionId ? { ...position, ...patch } : position,
              ),
            }
          : item,
      ),
    );
  };

  const saveOrgShift = async (
    key: string,
    body: {
      departmentId: string;
      jobPositionId: string | null;
      startTime: string;
      endTime: string;
      weeklyOffDays: number[];
    },
  ) => {
    setShiftSavingKey(key);
    setMessage(null);
    try {
      await axios.put("/api/attendance/department-shifts", body);
      setMessage("Shift saved. Open the attendance month to apply it. Corrected and finalized days stay unchanged.");
      await load(true);
    } catch (saveError) {
      setMessage(errorMessage(saveError, "Could not save the shift"));
    } finally {
      setShiftSavingKey(null);
    }
  };

  const clearOrgShift = async (key: string, departmentId: string, jobPositionId: string) => {
    setShiftSavingKey(key);
    setMessage(null);
    try {
      await axios.delete("/api/attendance/department-shifts", {
        params: { departmentId, jobPositionId },
      });
      setMessage(jobPositionId ? "Designation now uses the department hours." : "Department now uses the company hours.");
      await load(true);
    } catch (saveError) {
      setMessage(errorMessage(saveError, "Could not clear the shift"));
    } finally {
      setShiftSavingKey(null);
    }
  };

  const lockMonth = async (path: "finalize" | "reopen") => {
    setMessage(null);
    try {
      await axios.post(`/api/attendance/${path}`, { month: month.key });
      setMessage(path === "finalize" ? `${payrollMonthLabel(month)} is finalized.` : `${payrollMonthLabel(month)} is open again.`);
    } catch (saveError) {
      setMessage(errorMessage(saveError, "Could not update the month"));
    }
  };

  return (
    <div className={sheetFrameClass}>
      <div className={sheetToolbarClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            heading="Attendance settings"
            subheading="Company hours apply when a department has no shift of its own. A designation can use different hours. Confirm the policy before absences affect loss of pay."
          />
          <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
            <Link href="/dashboard/attendance">Back to attendance</Link>
          </Button>
        </div>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
      <div className={sheetScrollClass}>
        {loading ? <FinanceSheetSkeleton /> : null}
        {!loading && error ? <FinanceSheetError message={error} onRetry={() => void load()} /> : null}
        {!loading && policy ? (
          <div className="space-y-8 p-4">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Company policy</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Name">
                  <Input value={policy.policyName} onChange={(event) => setPolicy({ ...policy, policyName: event.target.value })} className="h-10" />
                </Field>
                <Field label="Shift start">
                  <Input value={policy.shiftStart} onChange={(event) => setPolicy({ ...policy, shiftStart: event.target.value })} className="h-10" />
                </Field>
                <Field label="Shift end">
                  <Input value={policy.shiftEnd} onChange={(event) => setPolicy({ ...policy, shiftEnd: event.target.value })} className="h-10" />
                </Field>
                <Field label="Grace minutes">
                  <Input type="number" min={0} max={180} value={policy.graceMinutes} onChange={(event) => setPolicy({ ...policy, graceMinutes: Number(event.target.value) })} className="h-10" />
                </Field>
                <Field label="Cutoff time">
                  <Input value={policy.cutoffTime} onChange={(event) => setPolicy({ ...policy, cutoffTime: event.target.value })} className="h-10" />
                </Field>
                <Field label="Half-day LOP factor">
                  <Input type="number" min={0} max={1} step={0.1} value={policy.halfDayLopFactor} onChange={(event) => setPolicy({ ...policy, halfDayLopFactor: Number(event.target.value) })} className="h-10" />
                </Field>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Weekly offs</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((label, index) => {
                    const active = policy.weeklyOffDays.includes(index);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        className={`h-9 rounded-md border px-3 text-sm ${active ? "border-foreground bg-muted" : "border-border"}`}
                        onClick={() => {
                          const weeklyOffDays = active
                            ? policy.weeklyOffDays.filter((day) => day !== index)
                            : [...policy.weeklyOffDays, index];
                          setPolicy({ ...policy, weeklyOffDays });
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Alternate Saturdays">
                <select
                  aria-label="Alternate Saturday off pattern"
                  className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
                  value={policy.alternateSaturdayOff}
                  onChange={(event) =>
                    setPolicy({
                      ...policy,
                      alternateSaturdayOff: event.target.value as PolicyView["alternateSaturdayOff"],
                    })
                  }
                >
                  <option value="none">None — only the weekly-off days above</option>
                  <option value="cycle_a">
                    Every other Saturday — cycle A ({alternateSaturdayPreview("cycle_a", month.key)})
                  </option>
                  <option value="cycle_b">
                    Every other Saturday — cycle B ({alternateSaturdayPreview("cycle_b", month.key)})
                  </option>
                </select>
              </Field>
              {policy.alternateSaturdayOff !== "none" ? (
                <p className="text-sm text-muted-foreground">
                  Continues across months: one Saturday off, the next Saturday working, then off again.
                  {policy.weeklyOffDays.includes(6)
                    ? " Saturday is already a full weekly off, so this rule does not change anything."
                    : ` This month: ${alternateSaturdayPreview(policy.alternateSaturdayOff, month.key)}. If the wrong Saturdays are off, switch to the other cycle.`}
                </p>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={policy.lateCreatesLop}
                  onChange={(event) => setPolicy({ ...policy, lateCreatesLop: event.target.checked })}
                />
                Apply late arrival loss-of-pay rules
              </label>
              {policy.lateCreatesLop ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Grace lates per month before LOP">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={policy.lateGraceThresholdCount}
                      onChange={(event) =>
                        setPolicy({ ...policy, lateGraceThresholdCount: Number(event.target.value) })
                      }
                      className="h-10"
                    />
                  </Field>
                  <Field label="LOP when grace threshold is reached">
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={policy.lateLopFactor}
                      onChange={(event) => setPolicy({ ...policy, lateLopFactor: Number(event.target.value) })}
                      className="h-10"
                    />
                  </Field>
                  <Field label="Minutes after shift start for half day">
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={policy.severeLateMinutes}
                      onChange={(event) =>
                        setPolicy({ ...policy, severeLateMinutes: Number(event.target.value) })
                      }
                      className="h-10"
                    />
                  </Field>
                  <p className="text-sm text-muted-foreground md:col-span-3">
                    Crossing grace {policy.lateGraceThresholdCount} times in a month adds {policy.lateLopFactor} LOP
                    day. Arriving {policy.severeLateMinutes}+ minutes after shift start is a half day and deducts{" "}
                    {policy.halfDayLopFactor} day each time.
                  </p>
                </div>
              ) : null}
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">Leave</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Paid leave credited each month (days)">
                    <Input type="number" min={0} max={31} step={0.5} value={policy.paidLeaveMonthlyAccrual} onChange={(event) => setPolicy({ ...policy, paidLeaveMonthlyAccrual: Number(event.target.value) })} className="h-10" />
                  </Field>
                  <Field label="Carry forward into a new year (max days)">
                    <Input type="number" min={0} max={366} step={0.5} value={policy.paidLeaveCarryForwardCap} onChange={(event) => setPolicy({ ...policy, paidLeaveCarryForwardCap: Number(event.target.value) })} className="h-10" />
                  </Field>
                  <Field label="Highest paid leave balance (days)">
                    <Input type="number" min={0} max={366} step={0.5} value={policy.paidLeaveMaxBalance} onChange={(event) => setPolicy({ ...policy, paidLeaveMaxBalance: Number(event.target.value) })} className="h-10" />
                  </Field>
                  <Field label="LOP days for each unplanned leave day">
                    <Input type="number" min={0} max={10} step={0.5} value={policy.unplannedLeaveLopDays} onChange={(event) => setPolicy({ ...policy, unplannedLeaveLopDays: Number(event.target.value) })} className="h-10" />
                  </Field>
                  <Field label="Notice needed for planned leave (days)">
                    <Input type="number" min={0} max={60} value={policy.plannedLeaveMinNoticeDays} onChange={(event) => setPolicy({ ...policy, plannedLeaveMinNoticeDays: Number(event.target.value) })} className="h-10" />
                  </Field>
                  <Field label="Days back an employee can mark unplanned leave">
                    <Input type="number" min={0} max={60} value={policy.unplannedBackdateDays} onChange={(event) => setPolicy({ ...policy, unplannedBackdateDays: Number(event.target.value) })} className="h-10" />
                  </Field>
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  Staff earn {policy.paidLeaveMonthlyAccrual} paid day(s) on the 1st of each month, shared out by joining date in the first month. Planned leave uses the balance first and any days beyond it are unpaid. An unplanned leave day is never paid and costs {policy.unplannedLeaveLopDays} LOP day(s). Paid leave started accruing in {policy.leaveAccrualStartMonth || "the current month"}.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={policy.confirmed}
                  onChange={(event) => setPolicy({ ...policy, confirmed: event.target.checked })}
                />
                Confirm this policy. After cutoff, a working day with no login is unapproved leave.
              </label>
              <Button type="button" className="h-10 cursor-pointer" disabled={saving} onClick={() => void savePolicy()}>
                {saving ? "Saving…" : "Save policy"}
              </Button>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Holidays</h2>
              <div className="flex flex-wrap gap-2">
                <Input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} className="h-10 w-40" aria-label="Holiday date" />
                <Input value={holidayName} onChange={(event) => setHolidayName(event.target.value)} placeholder="Holiday name" className="h-10 w-56" aria-label="Holiday name" />
                <select
                  aria-label="Holiday department"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={holidayDepartment}
                  onChange={(event) => setHolidayDepartment(event.target.value)}
                >
                  <option value="">All departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" className="h-10 cursor-pointer" onClick={() => void addHoliday()}>
                  Add holiday
                </Button>
              </div>
              <ul className="space-y-1 text-sm">
                {holidays.length === 0 ? <li className="text-muted-foreground">No holidays yet.</li> : null}
                {holidays.map((holiday) => (
                  <li key={holiday.id} className="flex items-center justify-between gap-3 border-b border-border py-2">
                    <span>{holiday.date} · {holiday.name}{holiday.departmentName ? ` · ${holiday.departmentName}` : ""}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 cursor-pointer"
                      onClick={() => {
                        void axios.delete(`/api/attendance/holidays/${holiday.id}`).then(() => load());
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold">Department shifts</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  An employee with a department and designation uses that designation&apos;s hours. If the designation has none, they use the department hours. Saving here does not scan every employee. Open months pick up the change the next time attendance is opened, and corrected or finalized days stay as they are.
                </p>
              </div>
              {departmentShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add a department before setting its hours.</p>
              ) : null}
              {departmentShifts.map((department) => {
                const departmentKey = `department:${department.departmentId}`;
                return (
                  <div key={department.departmentId} className="space-y-3 rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{department.departmentName}</h3>
                      <span className="text-xs text-muted-foreground">
                        {department.saved ? "Department hours" : "Company hours"}
                      </span>
                    </div>
                    <ShiftTimeFields
                      start={department.startTime}
                      end={department.endTime}
                      offs={department.weeklyOffDays}
                      onStart={(startTime) => updateDepartmentShift(department.departmentId, { startTime })}
                      onEnd={(endTime) => updateDepartmentShift(department.departmentId, { endTime })}
                      onToggle={(day) =>
                        updateDepartmentShift(department.departmentId, {
                          weeklyOffDays: toggleWeekday(department.weeklyOffDays, day),
                        })
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 cursor-pointer"
                        disabled={shiftSavingKey === departmentKey}
                        onClick={() =>
                          void saveOrgShift(departmentKey, {
                            departmentId: department.departmentId,
                            jobPositionId: null,
                            startTime: department.startTime,
                            endTime: department.endTime,
                            weeklyOffDays: department.weeklyOffDays,
                          })
                        }
                      >
                        {shiftSavingKey === departmentKey ? "Saving…" : "Save department hours"}
                      </Button>
                      {department.saved ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 cursor-pointer"
                          disabled={shiftSavingKey === departmentKey}
                          onClick={() => void clearOrgShift(departmentKey, department.departmentId, "")}
                        >
                          Use company hours
                        </Button>
                      ) : null}
                    </div>
                    {department.positions.length > 0 ? (
                      <ul className="space-y-3 border-t border-border pt-3">
                        {department.positions.map((position) => {
                          const positionKey = `position:${position.jobPositionId}`;
                          return (
                            <li key={position.jobPositionId} className="space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium">{position.name}</p>
                                <span className="text-xs text-muted-foreground">
                                  {position.saved ? "Own hours" : "Same as department"}
                                </span>
                              </div>
                              <ShiftTimeFields
                                start={position.startTime}
                                end={position.endTime}
                                offs={position.weeklyOffDays}
                                onStart={(startTime) =>
                                  updatePositionShift(department.departmentId, position.jobPositionId, { startTime })
                                }
                                onEnd={(endTime) =>
                                  updatePositionShift(department.departmentId, position.jobPositionId, { endTime })
                                }
                                onToggle={(day) =>
                                  updatePositionShift(department.departmentId, position.jobPositionId, {
                                    weeklyOffDays: toggleWeekday(position.weeklyOffDays, day),
                                  })
                                }
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 cursor-pointer"
                                  disabled={shiftSavingKey === positionKey}
                                  onClick={() =>
                                    void saveOrgShift(positionKey, {
                                      departmentId: department.departmentId,
                                      jobPositionId: position.jobPositionId,
                                      startTime: position.startTime,
                                      endTime: position.endTime,
                                      weeklyOffDays: position.weeklyOffDays,
                                    })
                                  }
                                >
                                  {shiftSavingKey === positionKey ? "Saving…" : "Save designation hours"}
                                </Button>
                                {position.saved ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-9 cursor-pointer"
                                    disabled={shiftSavingKey === positionKey}
                                    onClick={() =>
                                      void clearOrgShift(positionKey, department.departmentId, position.jobPositionId)
                                    }
                                  >
                                    Use department hours
                                  </Button>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Individual shifts</h2>
              <p className="text-sm text-muted-foreground">
                Use this only when one person should differ from their department and designation. It applies from the start date. An overnight shift uses the date it starts.
              </p>
              <div className="flex flex-wrap gap-2">
                <Input value={shiftCode} onChange={(event) => setShiftCode(event.target.value)} placeholder="Employee code or email" className="h-10 w-56" aria-label="Employee code or email" />
                <Input value={shiftStart} onChange={(event) => setShiftStart(event.target.value)} className="h-10 w-24" aria-label="Shift start" />
                <Input value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)} className="h-10 w-24" aria-label="Shift end" />
                <Input type="date" value={shiftFrom} onChange={(event) => setShiftFrom(event.target.value)} className="h-10 w-40" aria-label="Effective from" />
                <Input type="date" value={shiftTo} onChange={(event) => setShiftTo(event.target.value)} className="h-10 w-40" aria-label="Effective to" />
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((label, index) => {
                  const active = shiftOffs.includes(index);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={active}
                      className={`h-9 rounded-md border px-3 text-sm ${active ? "border-foreground bg-muted" : "border-border"}`}
                      onClick={() => {
                        setShiftOffs(active ? shiftOffs.filter((day) => day !== index) : [...shiftOffs, index]);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
                <Button type="button" variant="outline" className="h-9 cursor-pointer" onClick={() => void addShift()}>
                  Save shift
                </Button>
              </div>
              <ul className="space-y-1 text-sm">
                {shifts.length === 0 ? <li className="text-muted-foreground">No individual exceptions.</li> : null}
                {shifts.map((shift) => (
                  <li key={shift.id} className="border-b border-border py-2">
                    {shift.employeeName} {shift.employeeCode ? `(${shift.employeeCode})` : ""} · {shift.startTime}–{shift.endTime} · from {shift.effectiveFrom}
                    {shift.effectiveTo ? ` to ${shift.effectiveTo}` : ""}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">{payrollMonthLabel(month)}</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Finalizing pauses automatic updates for this month and keeps the policy that was in effect. Reopening allows login sync again. Corrections after a salary slip mark that slip as out of date.
              </p>
              <div className="flex gap-2">
                <Button type="button" className="h-10 cursor-pointer" onClick={() => void lockMonth("finalize")}>
                  Finalize month
                </Button>
                <Button type="button" variant="outline" className="h-10 cursor-pointer" onClick={() => void lockMonth("reopen")}>
                  Reopen month
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function toggleWeekday(days: number[], day: number): number[] {
  return days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort((left, right) => left - right);
}

function ShiftTimeFields({
  start,
  end,
  offs,
  onStart,
  onEnd,
  onToggle,
}: {
  start: string;
  end: string;
  offs: number[];
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  onToggle: (day: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={start} onChange={(event) => onStart(event.target.value)} className="h-10 w-24" aria-label="Shift start" />
      <Input value={end} onChange={(event) => onEnd(event.target.value)} className="h-10 w-24" aria-label="Shift end" />
      {WEEKDAYS.map((label, index) => {
        const active = offs.includes(index);
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            className={`h-9 cursor-pointer rounded-md border px-3 text-sm ${active ? "border-foreground bg-muted" : "border-border"}`}
            onClick={() => onToggle(index)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return fallback;
}
