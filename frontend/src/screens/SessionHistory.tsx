import { useState, useMemo } from "react";
import type { SessionLog } from "../types";

// ============================================================
// Placeholder data — swap for real API call (GET /api/sessions)
// ============================================================

const SESSIONS: SessionLog[] = [
  {
    id: "s1",
    flowTitle: "STEM Problem-Solving Loop",
    flowTag: "STEM",
    startedAt: "2026-10-05T14:30:00Z",
    durationMinutes: 45,
    subject: "Biology",
    hasReflection: true,
    reflection: {
      sessionTitle: "Biology Midterm — session complete",
      sessionSubtitle: "Concept Map → Active Recall → Self-Explain · 45 min",
      comprehension: 4,
      fatigue: 2,
      notes: "Concept mapping helped visualize the metabolic pathways. Self-explain caught gaps in Krebs cycle.",
    },
  },
  {
    id: "s2",
    flowTitle: "History Memorization Track",
    flowTag: "Humanities",
    startedAt: "2026-10-04T19:00:00Z",
    durationMinutes: 30,
    subject: "History",
    hasReflection: true,
    reflection: {
      sessionTitle: "WWI Causes — session complete",
      sessionSubtitle: "Timeline → Flashcards → Feynman · 30 min",
      comprehension: 5,
      fatigue: 1,
      notes: "Timeline method worked great for cause chains. Feynman on 'alliances' solidified it.",
    },
  },
  {
    id: "s3",
    flowTitle: "Thesis Writing Flow",
    flowTag: "Research",
    startedAt: "2026-10-03T10:15:00Z",
    durationMinutes: 90,
    subject: "Literature",
    hasReflection: false,
  },
  {
    id: "s4",
    flowTitle: "Board Exam Review",
    flowTag: "Review",
    startedAt: "2026-10-02T16:45:00Z",
    durationMinutes: 60,
    subject: "Chemistry",
    hasReflection: true,
    reflection: {
      sessionTitle: "Organic Chem Review — session complete",
      sessionSubtitle: "Spaced Rep → Practice Problems · 60 min",
      comprehension: 3,
      fatigue: 4,
      notes: "Fatigue hit hard at 45 min. Need shorter sessions or more breaks.",
    },
  },
  {
    id: "s5",
    flowTitle: "STEM Problem-Solving Loop",
    flowTag: "STEM",
    startedAt: "2026-10-01T08:00:00Z",
    durationMinutes: 50,
    subject: "Mathematics",
    hasReflection: true,
    reflection: {
      sessionTitle: "Calculus II — session complete",
      sessionSubtitle: "Concept Map → Active Recall → Self-Explain · 50 min",
      comprehension: 4,
      fatigue: 3,
      notes: "Integration by parts finally clicked. Self-explain was key.",
    },
  },
  {
    id: "s6",
    flowTitle: "Physics Problem Set",
    flowTag: "STEM",
    startedAt: "2026-09-30T15:20:00Z",
    durationMinutes: 40,
    subject: "Physics",
    hasReflection: false,
  },
  {
    id: "s7",
    flowTitle: "Essay Outline Flow",
    flowTag: "Research",
    startedAt: "2026-09-29T11:00:00Z",
    durationMinutes: 35,
    subject: "Literature",
    hasReflection: true,
    reflection: {
      sessionTitle: "Thesis Outline — session complete",
      sessionSubtitle: "Mind Map → Structured Outline · 35 min",
      comprehension: 5,
      fatigue: 2,
      notes: "Mind map → outline transition was smooth. Ready to write intro.",
    },
  },
  {
    id: "s8",
    flowTitle: "Vocabulary Builder",
    flowTag: "Humanities",
    startedAt: "2026-09-28T20:30:00Z",
    durationMinutes: 25,
    subject: "History",
    hasReflection: false,
  },
  {
    id: "s9",
    flowTitle: "STEM Problem-Solving Loop",
    flowTag: "STEM",
    startedAt: "2026-09-27T09:45:00Z",
    durationMinutes: 55,
    subject: "Biology",
    hasReflection: true,
    reflection: {
      sessionTitle: "Cell Biology — session complete",
      sessionSubtitle: "Concept Map → Active Recall → Self-Explain · 55 min",
      comprehension: 4,
      fatigue: 2,
      notes: "Mitochondria diagram from memory — nailed it.",
    },
  },
  {
    id: "s10",
    flowTitle: "Chemistry Lab Prep",
    flowTag: "STEM",
    startedAt: "2026-09-26T13:10:00Z",
    durationMinutes: 45,
    subject: "Chemistry",
    hasReflection: false,
  },
];

// ============================================================
// Helpers
// ============================================================

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ============================================================
// UI Components
// ============================================================

function SessionCard({ session, onViewReflection }: { session: SessionLog; onViewReflection: (s: SessionLog) => void }) {
  return (
    <div className="card session-card">
      <div className="session-header">
        <div className="session-main">
          <span className="session-tag">{session.flowTag}</span>
          <h3 className="session-title">{session.flowTitle}</h3>
        </div>
        <div className="session-meta">
          <span className="session-time">{formatTime(session.startedAt)}</span>
          <span className="session-duration">{formatDuration(session.durationMinutes)}</span>
        </div>
      </div>

      <div className="session-details">
        <span className="session-subject">{session.subject}</span>
        <span className="session-date">{formatDate(session.startedAt)}</span>
      </div>

      {session.hasReflection && (
        <button className="btn ghost session-reflection-btn" onClick={() => onViewReflection(session)}>
          View reflection
        </button>
      )}
    </div>
  );
}

function ReflectionModal({
  reflection,
  onClose,
}: {
  reflection: NonNullable<SessionLog["reflection"]>;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{reflection.sessionTitle}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal-sub">{reflection.sessionSubtitle}</p>

        <div className="modal-grid">
          <div className="modal-stat">
            <span className="modal-stat-label">Comprehension</span>
            <span className="modal-stat-val">{reflection.comprehension}/5</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Mental fatigue</span>
            <span className="modal-stat-val">{reflection.fatigue}/5</span>
          </div>
        </div>

        {reflection.notes && (
          <div className="modal-notes">
            <span className="modal-notes-label">Notes</span>
            <p>{reflection.notes}</p>
          </div>
        )}

        <button className="btn modal-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function FilterChips({ active, onChange }: { active: string[]; onChange: (filters: string[]) => void }) {
  const allFilters = ["All", "STEM", "Humanities", "Research", "Review", "With reflection"];

  return (
    <div className="filter-chips">
      {allFilters.map((filter) => {
        const isActive = filter === "All" ? active.length === 0 : active.includes(filter);
        return (
          <button
            key={filter}
            className={`filter-chip${isActive ? " active" : ""}`}
            onClick={() => {
              if (filter === "All") {
                onChange([]);
              } else if (isActive) {
                onChange(active.filter((f) => f !== filter));
              } else {
                onChange([...active, filter]);
              }
            }}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Session History Screen
// ============================================================

export default function SessionHistory() {
  const [filters, setFilters] = useState<string[]>([]);
  const [selectedReflection, setSelectedReflection] = useState<SessionLog | null>(null);

  const filteredSessions = useMemo(() => {
    return SESSIONS.filter((session) => {
      if (filters.length === 0) return true;

      const hasTagMatch = filters.some((f) => session.flowTag === f);
      const hasReflectionMatch = filters.includes("With reflection") && session.hasReflection;

      return hasTagMatch || hasReflectionMatch;
    });
  }, [filters]);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, SessionLog[]> = {};
    for (const session of filteredSessions) {
      const key = formatDate(session.startedAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(session);
    }
    return groups;
  }, [filteredSessions]);

  return (
    <section className="screen">
      <div className="eyebrow">Should-Have &middot; 04</div>
      <h1 className="page-title">Session history</h1>
      <p className="page-sub">
        Review every study session you've completed. Filter by tag, find sessions with reflections,
        and track your learning journey over time.
      </p>

      {/* Filters */}
      <div className="card filter-card">
        <FilterChips active={filters} onChange={setFilters} />
      </div>

      {/* Sessions list */}
      <div className="sessions-list">
        {Object.entries(groupedSessions).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No sessions match</h3>
            <p>Try adjusting your filters or start a new study flow.</p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([date, sessions]) => (
            <div key={date} className="session-group">
              <div className="session-group-label">{date}</div>
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onViewReflection={setSelectedReflection}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Reflection Modal */}
      {selectedReflection?.reflection && (
        <ReflectionModal
          reflection={selectedReflection.reflection}
          onClose={() => setSelectedReflection(null)}
        />
      )}
    </section>
  );
}