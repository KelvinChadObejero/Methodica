import type { SessionLog } from "./domain.js";

export function sessionsCsv(sessions: SessionLog[]) {
  const escape = (value: unknown) => {
    let cell = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(cell)) cell = "'" + cell;
    return `"${cell.replace(/"/g, '""')}"`;
  };
  const rows = sessions.map((session) => [
    session.id,
    session.flowTitle,
    session.subject,
    session.startedAt,
    session.durationMinutes,
    session.focusMinutes,
    session.status,
    session.reflection?.comprehension,
    session.reflection?.fatigue,
    session.reflection?.notes,
    session.timingSource || "recorded",
  ]);
  return [
    [
      "id",
      "flow",
      "subject",
      "startedAt",
      "durationMinutes",
      "focusMinutes",
      "status",
      "comprehension",
      "fatigue",
      "notes",
      "timingSource",
    ],
    ...rows,
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}
