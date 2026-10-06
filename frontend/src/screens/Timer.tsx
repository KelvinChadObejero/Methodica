import { useState, useEffect, useRef } from "react";
import type { StudyFlow, StudyBlock, SessionLog } from "../types";

// ============================================================
// Preset flows & defaults
// ============================================================

const PRESET_FLOWS: StudyFlow[] = [
  {
    id: "pomodoro",
    title: "Pomodoro",
    tag: "Focus",
    totalMinutes: 25,
    blocks: [
      { id: "b1", title: "Focus", type: "focus", durationMinutes: 25 },
    ],
  },
  {
    id: "pomodoro-long",
    title: "Pomodoro (Long)",
    tag: "Focus",
    totalMinutes: 50,
    blocks: [
      { id: "b1", title: "Focus", type: "focus", durationMinutes: 50 },
    ],
  },
  {
    id: "flow-90",
    title: "Deep Work (90 min)",
    tag: "Focus",
    totalMinutes: 90,
    blocks: [
      { id: "b1", title: "Focus", type: "focus", durationMinutes: 90 },
    ],
  },
  {
    id: "flow-standard",
    title: "Standard Flow",
    tag: "Study",
    totalMinutes: 55,
    blocks: [
      { id: "b1", title: "Review", type: "review", durationMinutes: 5 },
      { id: "b2", title: "Focus", type: "focus", durationMinutes: 25 },
      { id: "b3", title: "Break", type: "break", durationMinutes: 5 },
      { id: "b4", title: "Focus", type: "focus", durationMinutes: 20 },
    ],
  },
];

const STORAGE_KEY_SESSIONS = "methodica-sessions";

function loadSessions(): SessionLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (stored) return JSON.parse(stored);
  } catch { }
  return [];
}

function saveSessions(sessions: SessionLog[]) {
  localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getBlockColor(type: StudyBlock["type"]) {
  switch (type) {
    case "focus": return "var(--accent)";
    case "break": return "#22C55E";
    case "review": return "#A855F7";
    case "recall": return "#F59E0B";
    default: return "var(--accent)";
  }
}

function getBlockLabel(type: StudyBlock["type"]) {
  switch (type) {
    case "focus": return "Focus";
    case "break": return "Break";
    case "review": return "Review";
    case "recall": return "Recall";
    default: return type;
  }
}

// ============================================================
// UI Components
// ============================================================

function FlowSelector({
  flows,
  selectedId,
  onSelect,
}: {
  flows: StudyFlow[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flow-selector">
      {flows.map((flow) => (
        <button
          key={flow.id}
          className={`flow-chip${selectedId === flow.id ? " active" : ""}`}
          onClick={() => onSelect(flow.id)}
        >
          <span className="flow-chip-tag" style={{ background: getBlockColor(flow.blocks[0]?.type || "focus") }}>
            {flow.tag}
          </span>
          {flow.title}
          <span className="flow-chip-duration">{flow.totalMinutes} min</span>
        </button>
      ))}
    </div>
  );
}

function TimerDisplay({
  timeLeft,
  totalTime,
  block,
}: {
  timeLeft: number;
  totalTime: number;
  block: StudyBlock | null;
}) {
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
  const radius = 120;
  const stroke = 8;
  const circumference = 2 * Math.PI * (radius - stroke / 2);
  const offset = circumference * (1 - progress);

  return (
    <div className="timer-display">
      <svg width={radius * 2} height={radius * 2} className="timer-ring">
        <circle
          className="ring-bg"
          cx={radius}
          cy={radius}
          r={radius - stroke / 2}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="ring-progress"
          cx={radius}
          cy={radius}
          r={radius - stroke / 2}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ stroke: block ? getBlockColor(block.type) : "var(--accent)" }}
        />
        <text
          x={radius}
          y={radius + 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontSize={48}
          fontWeight={700}
          fill="var(--ink)"
          className="timer-text"
        >
          {formatTime(timeLeft)}
        </text>
      </svg>
      {block && (
        <div className="timer-block-info">
          <span className="block-type" style={{ color: getBlockColor(block.type) }}>
            {getBlockLabel(block.type)}
          </span>
          <span className="block-title">{block.title}</span>
        </div>
      )}
    </div>
  );
}

function TimerControls({
  isRunning,
  onStart,
  onPause,
  onReset,
  onSkip,
  canSkip,
}: {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  canSkip: boolean;
}) {
  return (
    <div className="timer-controls">
      {!isRunning ? (
        <button className="btn btn-primary btn-lg" onClick={onStart}>
          Start
        </button>
      ) : (
        <button className="btn btn-primary btn-lg" onClick={onPause}>
          Pause
        </button>
      )}
      <button className="btn btn-ghost" onClick={onReset}>
        Reset
      </button>
      {canSkip && (
        <button className="btn btn-ghost" onClick={onSkip}>
          Skip
        </button>
      )}
    </div>
  );
}

function BlockProgress({
  blocks,
  currentIndex,
  timeLeft,
  totalTime,
}: {
  blocks: StudyBlock[];
  currentIndex: number;
  timeLeft: number;
  totalTime: number;
}) {
  const blockProgress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  return (
    <div className="block-progress">
      {blocks.map((block, i) => (
        <div key={block.id} className={`block-step${i === currentIndex ? " active" : ""}${i < currentIndex ? " done" : ""}`}>
          <div className="block-step-ring">
            {i < currentIndex ? (
              <span className="check">✓</span>
            ) : i === currentIndex ? (
              <div className="progress-fill" style={{ width: `${Math.min(100, blockProgress * 100)}%` }} />
            ) : (
              <span className="dot" />
            )}
          </div>
          <span className="block-step-label">{block.title}</span>
          <span className="block-step-time">{block.durationMinutes}m</span>
        </div>
      ))}
    </div>
  );
}

function CompletionModal({
  flow,
  onReflect,
  onDone,
}: {
  flow: StudyFlow;
  onReflect: () => void;
  onDone: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onDone}>
      <div className="modal-card completion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="completion-icon">✓</div>
        <h3>Session complete!</h3>
        <p>You finished <b>{flow.title}</b> ({flow.totalMinutes} min).</p>
        <div className="completion-actions">
          <button className="btn btn-primary" onClick={onReflect}>
            Log reflection
          </button>
          <button className="btn btn-ghost" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Timer Screen
// ============================================================

export default function Timer() {
  const [flows] = useState<StudyFlow[]>(PRESET_FLOWS);
  const [selectedFlowId, setSelectedFlowId] = useState("pomodoro");
  const [isRunning, setIsRunning] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const selectedFlow = flows.find((f) => f.id === selectedFlowId) || flows[0];
  const currentBlock = selectedFlow.blocks[currentBlockIndex] || null;
  const totalTime = currentBlock ? currentBlock.durationMinutes * 60 : 0;

  // Initialize timeLeft when flow/block changes
  useEffect(() => {
    if (currentBlock) {
      setTimeLeft(currentBlock.durationMinutes * 60);
    }
  }, [selectedFlowId, currentBlockIndex]);

  // Timer tick
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  // Auto-advance to next block
  useEffect(() => {
    if (isRunning && timeLeft === 0 && currentBlock) {
      const nextIndex = currentBlockIndex + 1;
      if (nextIndex < selectedFlow.blocks.length) {
        setCurrentBlockIndex(nextIndex);
      } else {
        // Flow complete
        setIsRunning(false);
        setShowCompletion(true);
        // Save session log
        saveSession();
      }
    }
  }, [timeLeft, isRunning, currentBlockIndex, selectedFlow]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          isRunning ? setIsRunning(false) : setIsRunning(true);
          break;
        case "KeyR":
          e.preventDefault();
          resetTimer();
          break;
        case "KeyS":
          e.preventDefault();
          if (isRunning && currentBlockIndex < selectedFlow.blocks.length - 1) {
            skipBlock();
          }
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isRunning, currentBlockIndex, selectedFlow]);

  function saveSession() {
    const sessions = loadSessions();
    const newSession: SessionLog = {
      id: generateId(),
      flowTitle: selectedFlow.title,
      flowTag: selectedFlow.tag,
      startedAt: new Date(Date.now() - selectedFlow.totalMinutes * 60 * 1000).toISOString(),
      durationMinutes: selectedFlow.totalMinutes,
      subject: selectedFlow.tag,
      hasReflection: false,
    };
    saveSessions([newSession, ...sessions]);
  }

  function startTimer() {
    setIsRunning(true);
  }

  function pauseTimer() {
    setIsRunning(false);
  }

  function resetTimer() {
    setIsRunning(false);
    setCurrentBlockIndex(0);
    if (currentBlock) {
      setTimeLeft(currentBlock.durationMinutes * 60);
    }
  }

  function skipBlock() {
    const nextIndex = currentBlockIndex + 1;
    if (nextIndex < selectedFlow.blocks.length) {
      setCurrentBlockIndex(nextIndex);
    } else {
      setIsRunning(false);
      setShowCompletion(true);
      saveSession();
    }
  }

  function handleReflect() {
    setShowCompletion(false);
    // Navigate to reflection screen - we'll use a custom event
    window.dispatchEvent(new CustomEvent("navigate", { detail: "reflect" }));
  }

  function handleDone() {
    setShowCompletion(false);
    resetTimer();
  }

  return (
    <section className="screen timer-screen">
      <div className="eyebrow">Should-Have &middot; 05</div>
      <h1 className="page-title">Study timer</h1>
      <p className="page-sub">
        Run a timed study flow. Choose a preset or build your own in the Flow Builder (coming soon).
      </p>

      {/* Flow Selector */}
      <div className="card flow-selector-card">
        <FlowSelector flows={flows} selectedId={selectedFlowId} onSelect={setSelectedFlowId} />
      </div>

      {/* Timer Display */}
      <div className="card timer-card">
        <TimerDisplay
          timeLeft={timeLeft}
          totalTime={totalTime}
          block={currentBlock}
        />
        <BlockProgress
          blocks={selectedFlow.blocks}
          currentIndex={currentBlockIndex}
          timeLeft={timeLeft}
          totalTime={totalTime}
        />
        <TimerControls
          isRunning={isRunning}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
          onSkip={skipBlock}
          canSkip={currentBlockIndex < selectedFlow.blocks.length - 1}
        />
        <div className="timer-hints">
          <kbd>Space</kbd> Start/Pause &nbsp;·&nbsp;
          <kbd>R</kbd> Reset &nbsp;·&nbsp;
          <kbd>S</kbd> Skip
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="card shortcuts-card">
        <h3>Keyboard shortcuts</h3>
        <div className="shortcuts-grid">
          <div className="shortcut"><kbd>Space</kbd><span>Start / Pause</span></div>
          <div className="shortcut"><kbd>R</kbd><span>Reset timer</span></div>
          <div className="shortcut"><kbd>S</kbd><span>Skip block</span></div>
          <div className="shortcut"><kbd>← / →</kbd><span>Switch flow</span></div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletion && (
        <CompletionModal flow={selectedFlow} onReflect={handleReflect} onDone={handleDone} />
      )}
    </section>
  );
}