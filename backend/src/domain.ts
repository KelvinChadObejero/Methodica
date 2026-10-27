// The frontend imports these types only. Keep the HTTP contract in one place.
export interface StudyBlock {
  id: string;
  title: string;
  type: "focus" | "break" | "review" | "recall";
  durationMinutes: number;
  studyTypeId?: string;
}

export interface StudyFlow {
  id: string;
  title: string;
  tag: string;
  blocks: StudyBlock[];
  totalMinutes: number;
  sourceTemplateId?: string;
}

export interface StudyFlowTemplate extends StudyFlow {
  author: string;
}

export interface StudyType {
  id: string;
  title: string;
  type: StudyBlock["type"];
  description: string;
  instructions: string;
  suggestedMinutes: number;
}

export interface ReflectionEntry {
  sessionTitle: string;
  sessionSubtitle: string;
  comprehension: number;
  fatigue: number;
  notes: string;
}

export interface SessionLog {
  id: string;
  flowId: string;
  flowTitle: string;
  flowTag: string;
  startedAt: string;
  durationMinutes: number;
  focusMinutes: number;
  subject: string;
  status: "completed" | "stopped";
  hasReflection: boolean;
  reflection?: ReflectionEntry;
}

export interface Workspace {
  version: 1;
  flows: StudyFlow[];
  sessions: SessionLog[];
  templates: StudyFlowTemplate[];
}
