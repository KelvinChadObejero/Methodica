import type { SessionLog } from "./domain.js";
import { WorkspaceImportError } from "./workspace-import.js";

export interface ReportQuery {
  days: number;
  timezone: string;
  until: string;
  startDay: string;
}
export interface StudyReport extends ReportQuery {
  revision: number;
  count: number;
  totalSessions: number;
  focusMinutes: number;
  completed: number;
  reflections: number;
  streak: number;
  daily: { key: string; label: string; minutes: number }[];
  subjects: [string, number][];
}
export function dateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function shiftDay(key: string, offset: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function reportQuery(params: URLSearchParams, now = new Date()): ReportQuery {
  const days = Number(params.get("days") || 7);
  const timezone = params.get("timezone") || "UTC";
  if (![7, 30, 90].includes(days) || timezone.length > 100 || !/^[A-Za-z0-9_+\-/]+$/.test(timezone))
    throw new WorkspaceImportError("Invalid report range or timezone.");
  try {
    dateKey(now, timezone);
  } catch {
    throw new WorkspaceImportError("Unknown report timezone.");
  }
  const raw = params.get("until");
  const until = raw ? new Date(raw) : now;
  if (!Number.isFinite(until.getTime()) || until.getTime() > now.getTime() + 5000)
    throw new WorkspaceImportError("Invalid report end time.");
  return {
    days,
    timezone,
    until: until.toISOString(),
    startDay: shiftDay(dateKey(until, timezone), 1 - days),
  };
}
export function inReport(session: SessionLog, query: ReportQuery) {
  return (
    Date.parse(session.startedAt) <= Date.parse(query.until) &&
    dateKey(new Date(session.startedAt), query.timezone) >= query.startDay
  );
}
export function streakFor(days: Set<string>, today: string) {
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}
export function reportDaily(query: ReportQuery, totals: Map<string, number>) {
  return Array.from({ length: query.days }, (_, i) => {
    const key = shiftDay(query.startDay, i);
    return {
      key,
      label: `${Number(key.slice(5, 7))}/${Number(key.slice(8))}`,
      minutes: totals.get(key) || 0,
    };
  });
}
export function studyReport(sessions: SessionLog[], query: ReportQuery, revision = 0): StudyReport {
  const selected = sessions.filter((s) => inReport(s, query));
  const daily = new Map<string, number>();
  const subjects = new Map<string, number>();
  for (const session of selected) {
    const key = dateKey(new Date(session.startedAt), query.timezone);
    daily.set(key, (daily.get(key) || 0) + session.focusMinutes);
    subjects.set(session.subject, (subjects.get(session.subject) || 0) + session.focusMinutes);
  }
  const active = new Set(
    sessions
      .filter((s) => s.focusMinutes > 0 && Date.parse(s.startedAt) <= Date.parse(query.until))
      .map((s) => dateKey(new Date(s.startedAt), query.timezone))
  );
  return {
    ...query,
    revision,
    count: selected.length,
    totalSessions: sessions.length,
    focusMinutes: selected.reduce((sum, s) => sum + s.focusMinutes, 0),
    completed: selected.filter((s) => s.status === "completed").length,
    reflections: selected.filter((s) => s.hasReflection).length,
    streak: streakFor(active, dateKey(new Date(query.until), query.timezone)),
    daily: reportDaily(query, daily),
    subjects: [...subjects].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}
