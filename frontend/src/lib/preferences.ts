import type { SettingsPreferences } from "../types";

export const DEFAULT_PREFS: SettingsPreferences = {
  theme: "system",
  notifications: false,
  sessionReminders: false,
  weeklyReport: false,
  autoStartBreaks: true,
  breakDuration: 5,
  sessionDuration: 25,
  dataExportFormat: "json",
};

export function loadPrefs(): SettingsPreferences {
  try {
    const input = JSON.parse(localStorage.getItem("methodica-settings") || "{}");
    if (!input || typeof input !== "object" || Array.isArray(input)) return { ...DEFAULT_PREFS };
    return {
      theme: ["system", "light", "dark"].includes(input.theme) ? input.theme : "system",
      notifications: input.notifications === true,
      sessionReminders: false,
      weeklyReport: false,
      autoStartBreaks: typeof input.autoStartBreaks === "boolean" ? input.autoStartBreaks : true,
      breakDuration: Number.isInteger(input.breakDuration)
        ? Math.min(30, Math.max(1, input.breakDuration))
        : 5,
      sessionDuration: Number.isInteger(input.sessionDuration)
        ? Math.min(120, Math.max(5, input.sessionDuration))
        : 25,
      dataExportFormat: input.dataExportFormat === "csv" ? "csv" : "json",
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function applyTheme(theme: SettingsPreferences["theme"]) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}

export function savePrefs(prefs: SettingsPreferences) {
  localStorage.setItem("methodica-settings", JSON.stringify(prefs));
  applyTheme(prefs.theme);
  window.dispatchEvent(new Event("methodica-preferences"));
}
