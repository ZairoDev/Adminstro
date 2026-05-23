import EmployeeActivityLog from "@/models/employeeActivityLog";

type EndSessionsOptions = {
  employeeId: string;
  logoutTime: Date;
  sessionId?: string | null;
};

/** Mark active login activity logs as ended (optionally scoped to one session). */
export async function endActiveEmployeeLoginSessions({
  employeeId,
  logoutTime,
  sessionId,
}: EndSessionsOptions): Promise<number> {
  const baseQuery = {
    employeeId: String(employeeId),
    status: "active",
    activityType: "login" as const,
  };

  const sessions = await EmployeeActivityLog.find(
    sessionId ? { ...baseQuery, sessionId } : baseQuery,
  );

  if (sessions.length === 0) return 0;

  await Promise.all(
    sessions.map((session) => {
      const loginTime = session.loginTime ? new Date(session.loginTime) : null;
      const durationMinutes = loginTime
        ? Math.max(
            0,
            Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)),
          )
        : 0;
      session.logoutTime = logoutTime;
      session.duration = durationMinutes;
      session.status = "ended";
      session.lastActivityAt = logoutTime;
      return session.save().catch(() => undefined);
    }),
  );

  return sessions.length;
}
