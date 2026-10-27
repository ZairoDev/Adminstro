"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO, startOfMonth, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Building2, RefreshCcw } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { DatePickerWithRange } from "@/components/Date-picker-with-range";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardSectionSkeleton } from "@/components/ui/DashboardSectionSkeleton";
import { LOCATIONS } from "@/config/dashboardConfig";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useOwnerSheetEmployeeStats } from "@/hooks/shared/useOwnerSheetEmployeeStats";
import type {
  OwnerSheetEmployeeStat,
  OwnerSheetKind,
} from "@/lib/owner-sheet/employee-stats";

const LINE_COLORS = [
  "#2563EB",
  "#D97706",
  "#059669",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#EA580C",
  "#4F46E5",
];

const SHEET_OPTIONS: Array<{ value: OwnerSheetKind; label: string }> = [
  { value: "all", label: "Both sheets" },
  { value: "long-term", label: "Long-term" },
  { value: "short-term", label: "Short-term" },
];

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatAxisDate(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM");
}

function formatFullDate(isoDate: string): string {
  return format(parseISO(isoDate), "EEE, d MMM yyyy");
}

function locationSummary(employee: OwnerSheetEmployeeStat): string {
  if (employee.locations.length === 0) return "—";
  const shown = employee.locations
    .slice(0, 3)
    .map((item) => `${item.location} ${item.count}`);
  const extra = employee.locations.length - 3;
  return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
}

function displayName(
  employee: OwnerSheetEmployeeStat,
  employees: OwnerSheetEmployeeStat[],
): string {
  const shared = employees.filter((item) => item.name === employee.name).length > 1;
  if (!shared) return employee.name;
  const suffix = employee.email.split("@")[0] || employee.employeeId.slice(-4);
  return `${employee.name} (${suffix})`;
}

export function OwnerSheetEmployeeSection() {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [sheet, setSheet] = useState<OwnerSheetKind>("all");
  const [location, setLocation] = useState("All");
  const [employeeId, setEmployeeId] = useState("all");
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const end = new Date();
    return { from: subDays(end, 29), to: end };
  });

  const from = range?.from ? toIsoDate(range.from) : "";
  const to = range?.to ? toIsoDate(range.to) : "";

  const { data, isLoading, isFetching, isError, error, refetch } =
    useOwnerSheetEmployeeStats(
      { from, to, location, sheet },
      Boolean(from && to),
    );

  useEffect(() => {
    if (employeeId === "all" || !data) return;
    if (!data.employees.some((employee) => employee.employeeId === employeeId)) {
      setEmployeeId("all");
    }
  }, [data, employeeId]);

  const locationOptions = useMemo(() => {
    const cities = new Set<string>([...LOCATIONS, ...(data?.locations ?? [])]);
    if (location !== "All") cities.add(location);
    return ["All", ...Array.from(cities).sort((a, b) => a.localeCompare(b))];
  }, [data?.locations, location]);

  const plottedEmployees = useMemo(() => {
    if (!data) return [];
    if (employeeId === "all") return data.chartEmployees;
    return data.employees.filter((employee) => employee.employeeId === employeeId);
  }, [data, employeeId]);

  const visibleEmployees = plottedEmployees.filter(
    (employee) => !hiddenIds.includes(employee.employeeId),
  );

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    (data?.employees ?? []).forEach((employee, index) => {
      map.set(employee.employeeId, LINE_COLORS[index % LINE_COLORS.length]);
    });
    return map;
  }, [data?.employees]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    for (const employee of visibleEmployees) {
      config[employee.employeeId] = {
        label: displayName(employee, data?.employees ?? []),
        color: colorById.get(employee.employeeId) ?? LINE_COLORS[0],
      };
    }
    return config;
  }, [visibleEmployees, data?.employees, colorById]);

  const topEmployee = data?.employees[0];
  const summary = data
    ? `${data.total.toLocaleString()} properties from ${formatFullDate(data.from)} to ${formatFullDate(data.to)}${
        data.location !== "All" ? ` in ${data.location}` : ""
      }. ${data.employees.length.toLocaleString()} employees have a recorded addition.`
    : "";

  const applyPreset = (preset: "7" | "30" | "month") => {
    const end = new Date();
    if (preset === "month") {
      setRange({ from: startOfMonth(end), to: end });
      return;
    }
    const days = preset === "7" ? 6 : 29;
    setRange({ from: subDays(end, days), to: end });
  };

  const presetActive = (preset: "7" | "30" | "month"): boolean => {
    if (!range?.from || !range.to) return false;
    const end = toIsoDate(range.to);
    const today = toIsoDate(new Date());
    if (end !== today) return false;
    if (preset === "month") return toIsoDate(range.from) === toIsoDate(startOfMonth(range.to));
    const days = preset === "7" ? 6 : 29;
    return toIsoDate(range.from) === toIsoDate(subDays(range.to, days));
  };

  const toggleEmployee = (id: string) => {
    setHiddenIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <section className="my-8 rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="owner-sheet-additions-heading">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="owner-sheet-additions-heading" className="text-xl font-semibold text-foreground sm:text-2xl">
              Owner sheet additions
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Daily count of properties each employee adds on the owner sheet, by location and date.
            </p>
          </div>
        </div>
        {isFetching && !isLoading ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Updating…
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner-sheet-location" className="text-foreground">
            Location
          </Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger id="owner-sheet-location" className="h-11">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((city) => (
                <SelectItem key={city} value={city}>
                  {city === "All" ? "All locations" : city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner-sheet-kind" className="text-foreground">
            Sheet
          </Label>
          <Select
            value={sheet}
            onValueChange={(value) => setSheet(value as OwnerSheetKind)}
          >
            <SelectTrigger id="owner-sheet-kind" className="h-11">
              <SelectValue placeholder="Both sheets" />
            </SelectTrigger>
            <SelectContent>
              {SHEET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner-sheet-employee" className="text-foreground">
            Employee
          </Label>
          <Select
            value={employeeId}
            onValueChange={(value) => {
              setEmployeeId(value);
              setHiddenIds([]);
            }}
          >
            <SelectTrigger id="owner-sheet-employee" className="h-11">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {(data?.employees ?? []).map((employee) => (
                <SelectItem key={employee.employeeId} value={employee.employeeId}>
                  {displayName(employee, data?.employees ?? [])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id="owner-sheet-dates-label" className="text-foreground">
            Date
          </Label>
          <DatePickerWithRange
            date={range}
            setDate={setRange}
            className="w-full"
            buttonClassName="h-11 w-full sm:w-full"
          />
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-labelledby="owner-sheet-dates-label"
      >
        {(
          [
            ["7", "Last 7 days"],
            ["30", "Last 30 days"],
            ["month", "This month"],
          ] as const
        ).map(([preset, label]) => (
          <Button
            key={preset}
            type="button"
            size="lg"
            variant={presetActive(preset) ? "default" : "outline"}
            className="min-h-11"
            aria-pressed={presetActive(preset)}
            onClick={() => applyPreset(preset)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-6">
        {!from || !to ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Choose a start and end date to see employee additions.
          </p>
        ) : isLoading ? (
          <DashboardSectionSkeleton label="Loading owner sheet additions..." height="h-80" />
        ) : isError ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6" role="alert">
            <p className="text-sm text-foreground">
              {error instanceof Error ? error.message : "Could not load owner sheet additions."}
            </p>
            <Button type="button" variant="outline" size="lg" className="min-h-11" onClick={() => refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <p className="sr-only">{summary}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Properties added" value={data.total} hint={data.location === "All" ? "All locations" : data.location} />
              <Stat label="Recorded by employee" value={data.total - data.unattributed} hint="Rows with an employee name" />
              <Stat
                label="Employees"
                value={data.employees.length}
                hint={topEmployee ? `Most: ${topEmployee.name}` : "No additions yet"}
              />
            </div>

            {data.unattributed > 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {data.unattributed.toLocaleString()} {data.unattributed === 1 ? "property was" : "properties were"} added before employee tracking, so {data.unattributed === 1 ? "it is" : "they are"} not on the graph.
              </p>
            ) : null}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily additions</CardTitle>
                <CardDescription>
                  {employeeId === "all" && data.employees.length > data.chartEmployees.length
                    ? `Top ${data.chartEmployees.length} employees. Pick one employee to plot their full line.`
                    : "Each line is one employee. Days with no additions stay at zero."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {visibleEmployees.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    {data.employees.length === 0
                      ? "No employee-recorded properties in this range. New owner-sheet rows will appear here."
                      : "Turn an employee back on to see their line."}
                  </p>
                ) : (
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[320px] w-full sm:h-[380px]"
                  >
                    <LineChart
                      accessibilityLayer
                      data={data.series}
                      margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={24}
                        tickFormatter={formatAxisDate}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        width={36}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={({ active, label, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const rows = payload.filter(
                            (item) =>
                              typeof item.dataKey === "string" &&
                              visibleEmployees.some((employee) => employee.employeeId === item.dataKey),
                          );
                          return (
                            <div className="min-w-44 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
                              <p className="mb-2 text-sm font-semibold">
                                {typeof label === "string" ? formatFullDate(label) : ""}
                              </p>
                              <ul className="space-y-1">
                                {rows.map((item) => (
                                  <li key={String(item.dataKey)} className="flex items-center justify-between gap-4 text-sm">
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: String(item.color) }}
                                        aria-hidden="true"
                                      />
                                      <span className="truncate">{chartConfig[String(item.dataKey)]?.label}</span>
                                    </span>
                                    <span className="font-medium tabular-nums">{Number(item.value ?? 0)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }}
                      />
                      {visibleEmployees.map((employee) => (
                        <Line
                          key={employee.employeeId}
                          type="monotone"
                          dataKey={employee.employeeId}
                          name={displayName(employee, data.employees)}
                          stroke={colorById.get(employee.employeeId)}
                          strokeWidth={2}
                          dot={data.series.length < 45 ? { r: 2 } : false}
                          activeDot={{ r: 4 }}
                          isAnimationActive={!reduceMotion}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                )}

                {plottedEmployees.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4" aria-label="Chart employees">
                    {plottedEmployees.map((employee) => {
                      const hidden = hiddenIds.includes(employee.employeeId);
                      const color = colorById.get(employee.employeeId) ?? LINE_COLORS[0];
                      return (
                        <button
                          key={employee.employeeId}
                          type="button"
                          aria-pressed={!hidden}
                          onClick={() => toggleEmployee(employee.employeeId)}
                          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: hidden ? "transparent" : color, boxShadow: `inset 0 0 0 2px ${color}` }}
                            aria-hidden="true"
                          />
                          <span className={hidden ? "text-muted-foreground line-through" : "text-foreground"}>
                            {displayName(employee, data.employees)}
                          </span>
                          <span className="tabular-nums text-muted-foreground">{employee.total}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">
                  Properties each employee added on the owner sheet for the selected location and dates.
                </caption>
                <thead className="border-b bg-muted/40 text-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Employee</th>
                    <th scope="col" className="px-4 py-3 font-medium">Properties</th>
                    <th scope="col" className="px-4 py-3 font-medium">Share</th>
                    <th scope="col" className="px-4 py-3 font-medium">Locations</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No employee-recorded properties in this range.
                      </td>
                    </tr>
                  ) : (
                    data.employees.map((employee) => {
                      const share = data.total > 0 ? Math.round((employee.total / data.total) * 100) : 0;
                      const selected = employeeId === employee.employeeId;
                      return (
                        <tr
                          key={employee.employeeId}
                          className={selected ? "bg-primary/5" : "transition-colors duration-200 hover:bg-muted/40"}
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              aria-pressed={selected}
                              onClick={() => {
                                setHiddenIds([]);
                                setEmployeeId(selected ? "all" : employee.employeeId);
                              }}
                            >
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: colorById.get(employee.employeeId) }}
                                aria-hidden="true"
                              />
                              <span>
                                <span className="block font-medium text-foreground">
                                  {displayName(employee, data.employees)}
                                </span>
                                {employee.email ? (
                                  <span className="block text-xs text-muted-foreground">{employee.email}</span>
                                ) : null}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                            {employee.total.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">{share}%</td>
                          <td className="px-4 py-3 text-muted-foreground">{locationSummary(employee)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value.toLocaleString()}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
