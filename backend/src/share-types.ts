import type { SessionLog } from "./domain.js";

export interface SharingProfile {
  code: string;
  name: string;
}
export interface SessionGrant {
  id: string;
  recipient: SharingProfile;
  includeReflection: boolean;
  createdAt: string;
}
export interface SharedSessionSummary {
  id: string;
  ownerName: string;
  createdAt: string;
  includeReflection: boolean;
  title: string;
  subject: string;
  startedAt: string;
  focusMinutes: number;
  timingSource?: "legacy-estimate";
}
export interface SharedSessionPage {
  items: SharedSessionSummary[];
  total: number;
  nextOffset: number | null;
}
export interface SharedSessionDetail {
  id: string;
  ownerName: string;
  includeReflection: boolean;
  session: Omit<SessionLog, "id" | "flowId" | "hasReflection">;
}
