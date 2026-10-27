import type { Screen } from "../types";

const screens: Screen[] = [
  "dashboard",
  "builder",
  "studytypes",
  "sync",
  "community",
  "reflect",
  "history",
  "settings",
  "timer",
  "crud-demo",
];
export function currentScreen(): Screen {
  const value = window.location.hash.slice(1).split("?")[0] as Screen;
  return screens.includes(value) ? value : "dashboard";
}
export function navigate(screen: Screen) {
  window.location.hash = screen;
}
