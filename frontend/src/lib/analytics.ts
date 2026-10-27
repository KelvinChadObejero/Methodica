import type { SessionLog } from "../types";

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function offsetDay(date: Date, offset: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function summarize(sessions: SessionLog[], rangeDays: number, now = new Date()) {
  const start = offsetDay(now, 1 - rangeDays);
  const selected = sessions.filter(
    (session) =>
      Date.parse(session.startedAt) >= start.getTime() &&
      Date.parse(session.startedAt) <= now.getTime()
  );
  const focusMinutes = selected.reduce((sum, session) => sum + session.focusMinutes, 0);
  const days = new Set(
    sessions
      .filter(
        (session) => session.focusMinutes > 0 && Date.parse(session.startedAt) <= now.getTime()
      )
      .map((session) => dayKey(new Date(session.startedAt)))
  );
  let streak = 0;
  let cursor = offsetDay(now, days.has(dayKey(now)) ? 0 : -1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = offsetDay(cursor, -1);
  }
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = offsetDay(now, index - 6);
    const key = dayKey(date);
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      minutes: sessions
        .filter(
          (session) =>
            dayKey(new Date(session.startedAt)) === key &&
            Date.parse(session.startedAt) <= now.getTime()
        )
        .reduce((sum, session) => sum + session.focusMinutes, 0),
    };
  });
  const subjects: Record<string, number> = Object.create(null);
  for (const session of selected)
    subjects[session.subject] = (subjects[session.subject] || 0) + session.focusMinutes;
  return {
    selected,
    focusMinutes,
    streak,
    daily,
    subjects: Object.entries(subjects).sort((a, b) => b[1] - a[1]),
    completed: selected.filter((session) => session.status === "completed").length,
    reflections: selected.filter((session) => session.hasReflection).length,
  };
}
