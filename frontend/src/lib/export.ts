import type { SessionLog } from "../types";

export function download(content: string, filename: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
    ],
    ...rows,
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}
