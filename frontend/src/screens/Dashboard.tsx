import { useState } from "react";

// ============================================================
// Placeholder data — swap for real API calls once the backend
// exposes analytics endpoints (e.g. GET /api/analytics/summary,
// GET /api/analytics/focus-trends, GET /api/analytics/subjects).
// ============================================================

interface ConsistencyMetrics {
  currentStreak: number;
  longestStreak: number;
  sessionsThisWeek: number;
  weeklyGoal: number;
  totalSessions: number;
}

interface FocusMetrics {
  totalFocusHours: number;
  avgSessionLength: number; // minutes
  focusScore: number; // 0-100
  weeklyTrend: number[]; // last 7 days in minutes
}

interface SubjectBreakdown {
  subject: string;
  color: string;
  hours: number;
  sessions: number;
  progress: number; // 0-100
}

const CONSISTENCY: ConsistencyMetrics = {
  currentStreak: 7,
  longestStreak: 21,
  sessionsThisWeek: 5,
  weeklyGoal: 6,
  totalSessions: 128,
};

const FOCUS: FocusMetrics = {
  totalFocusHours: 247.5,
  avgSessionLength: 42,
  focusScore: 78,
  weeklyTrend: [35, 48, 42, 55, 38, 60, 45],
};

const SUBJECTS: SubjectBreakdown[] = [
  { subject: "Biology", color: "#4C4FE0", hours: 68.5, sessions: 32, progress: 82 },
  { subject: "Chemistry", color: "#E0703F", hours: 52.0, sessions: 24, progress: 65 },
  { subject: "Mathematics", color: "#22C55E", hours: 45.5, sessions: 21, progress: 71 },
  { subject: "History", color: "#A855F7", hours: 34.0, sessions: 16, progress: 48 },
  { subject: "Literature", color: "#EC4899", hours: 28.5, sessions: 14, progress: 55 },
  { subject: "Physics", color: "#06B6D4", hours: 19.0, sessions: 9, progress: 38 },
];

// ============================================================
// Small reusable UI pieces (scoped to this screen)
// ============================================================

function StatCard({
  label,
  value,
  subtitle,
  accent = false,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: accent ? "var(--accent)" : "var(--ink)" }}>
        {value}
      </div>
      {subtitle && <div className="stat-sub">{subtitle}</div>}
    </div>
  );
}

function ProgressRing({
  progress,
  size = 72,
  stroke = 6,
}: {
  progress: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        className="ring-bg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        className="ring-fg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ stroke: "var(--accent)" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Space Grotesk, sans-serif"
        fontSize={size * 0.28}
        fontWeight={600}
        fill="var(--ink)"
      >
        {progress}%
      </text>
    </svg>
  );
}

function WeeklyTrendChart({ data, accentColor = "var(--accent)" }: { data: number[]; accentColor?: string }) {
  const max = Math.max(...data, 1);
  const width = 280;
  const height = 80;
  const padding = 10;
  const stepX = (width - padding * 2) / (data.length - 1);

  const points = data
    .map((value, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (value / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="trend-chart" style={{ width, height }}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M${points}`}
          fill="none"
          stroke={accentColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        <path
          d={`M${points} L${width - padding},${height - padding} L${padding},${height - padding} Z`}
          fill="url(#trendGradient)"
        />
        {data.map((value, i) => {
          const x = padding + i * stepX;
          const y = height - padding - (value / max) * (height - padding * 2);
          return (
            <circle key={i} cx={x} cy={y} r={4} fill="var(--surface)" stroke={accentColor} strokeWidth={2} />
          );
        })}
      </svg>
    </div>
  );
}

function SubjectRow({ item }: { item: SubjectBreakdown }) {
  return (
    <div className="subject-row">
      <div className="subject-info">
        <span className="subject-dot" style={{ background: item.color }} />
        <div>
          <div className="subject-name">{item.subject}</div>
          <div className="subject-meta">
            {item.hours}h &middot; {item.sessions} sessions
          </div>
        </div>
      </div>
      <div className="subject-progress-wrap">
        <div className="subject-progress-bar">
          <div
            className="subject-progress-fill"
            style={{ width: `${item.progress}%`, background: item.color }}
          />
        </div>
        <span className="subject-progress-text">{item.progress}%</span>
      </div>
    </div>
  );
}

// ============================================================
// Dashboard Screen
// ============================================================

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("week");

  return (
    <section className="screen">
      <div className="eyebrow">Must-Have &middot; 01</div>
      <h1 className="page-title">Productivity analytics</h1>
      <p className="page-sub">
        Track consistency, focus time, and subject balance. Data aggregates from your completed
        sessions across web and mobile.
      </p>

      {/* Time range selector */}
      <div className="card toolbar-card">
        <div className="toolbar-left">
          <span className="toolbar-label">Time range</span>
          <div className="segmented">
            {(["week", "month", "quarter"] as const).map((range) => (
              <button
                key={range}
                className={`segment${timeRange === range ? " active" : ""}`}
                onClick={() => setTimeRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <button className="btn ghost">Export report</button>
      </div>

      {/* Consistency overview */}
      <div className="section">
        <h2 className="section-title">Consistency</h2>
        <div className="stat-grid">
          <StatCard
            label="Current streak"
            value={CONSISTENCY.currentStreak}
            subtitle="days in a row"
            accent
          />
          <StatCard
            label="Longest streak"
            value={CONSISTENCY.longestStreak}
            subtitle="days"
          />
          <StatCard
            label="Sessions this week"
            value={`${CONSISTENCY.sessionsThisWeek} / ${CONSISTENCY.weeklyGoal}`}
            subtitle={`${Math.round((CONSISTENCY.sessionsThisWeek / CONSISTENCY.weeklyGoal) * 100)}% of goal`}
            accent={CONSISTENCY.sessionsThisWeek >= CONSISTENCY.weeklyGoal}
          />
          <StatCard
            label="Total sessions"
            value={CONSISTENCY.totalSessions}
            subtitle="all time"
          />
        </div>

        {/* Streak ring */}
        <div className="card streak-card">
          <div className="streak-ring-wrap">
            <ProgressRing progress={Math.min(100, (CONSISTENCY.currentStreak / 30) * 100)} size={96} stroke={8} />
          </div>
          <div className="streak-details">
            <h3>Weekly consistency</h3>
            <p>You're on a <b>{CONSISTENCY.currentStreak}-day streak</b>. Keep it going to hit 30 days!</p>
            <WeeklyTrendChart data={FOCUS.weeklyTrend} />
          </div>
        </div>
      </div>

      {/* Focus time overview */}
      <div className="section">
        <h2 className="section-title">Focus time</h2>
        <div className="stat-grid">
          <StatCard
            label="Total focus time"
            value={`${FOCUS.totalFocusHours}h`}
            subtitle="all sessions combined"
          />
          <StatCard
            label="Avg session length"
            value={`${FOCUS.avgSessionLength} min`}
            subtitle="per study session"
          />
          <StatCard
            label="Focus score"
            value={`${FOCUS.focusScore}%`}
            subtitle="based on consistency & duration"
            accent
          />
        </div>

        <div className="card focus-trend-card">
          <h3>Daily focus trend (last 7 days)</h3>
          <WeeklyTrendChart data={FOCUS.weeklyTrend} />
          <div className="trend-labels">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Subject breakdown */}
      <div className="section">
        <h2 className="section-title">Subject breakdown</h2>
        <div className="card subjects-card">
          <div className="subjects-header">
            <h3>Time invested by subject</h3>
            <button className="btn ghost" style={{ fontSize: "12px", padding: "6px 12px" }}>
              View details
            </button>
          </div>
          <div className="subjects-list">
            {SUBJECTS.map((s) => (
              <SubjectRow key={s.subject} item={s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}