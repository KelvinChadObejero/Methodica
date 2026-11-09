import type { SessionLog } from "../types";
import { dateKey, reportQuery, studyReport, inReport } from "../../../backend/src/reporting";

export function dayKey(date: Date) {
  return dateKey(date, Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function summarize(sessions: SessionLog[], rangeDays: number, now = new Date()) {
  const query = reportQuery(
    new URLSearchParams({
      days: String(rangeDays),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    now
  );
  return { ...studyReport(sessions, query), selected: sessions.filter((s) => inReport(s, query)) };
}
