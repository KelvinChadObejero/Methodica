import { useState } from "react";
import type { ReflectionEntry } from "../types";

const SESSION: Pick<ReflectionEntry, "sessionTitle" | "sessionSubtitle"> = {
  sessionTitle: "Biology Midterm — session complete",
  sessionSubtitle: "Concept Map → Active Recall → Self-Explain · 45 min",
};

export default function Reflection() {
  const [comprehension, setComprehension] = useState(4);
  const [fatigue, setFatigue] = useState(2);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    const entry: ReflectionEntry = {
      ...SESSION,
      comprehension,
      fatigue,
      notes,
    };
    // Placeholder for POST /api/sessions/:id/log — wire up once the
    // StudySession endpoints exist.
    console.log("Reflection submitted:", entry);
    setSubmitted(true);
  }

  return (
    <section className="screen">
      <div className="eyebrow">Should-Have &middot; 03</div>
      <h1 className="page-title">Post-session reflection</h1>
      <p className="page-sub">
        A short check-in after every session, so Methodica can learn which flows actually work for
        you.
      </p>

      <div className="card reflect-card">
        <h3>{SESSION.sessionTitle}</h3>
        <p className="sub">{SESSION.sessionSubtitle}</p>

        <div className="slider-block">
          <div className="top">
            <b>Comprehension</b>
            <span className="val">{comprehension}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={comprehension}
            onChange={(e) => setComprehension(Number(e.target.value))}
          />
          <div className="scale-labels">
            <span>Foggy</span>
            <span>Crystal clear</span>
          </div>
        </div>

        <div className="slider-block">
          <div className="top">
            <b>Mental fatigue</b>
            <span className="val">{fatigue}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={fatigue}
            onChange={(e) => setFatigue(Number(e.target.value))}
          />
          <div className="scale-labels">
            <span>Fresh</span>
            <span>Drained</span>
          </div>
        </div>

        <textarea
          placeholder="Optional notes — what worked, what didn't..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button className="btn" style={{ width: "100%" }} onClick={handleSubmit}>
          Log reflection
        </button>

        <div className={`confirm${submitted ? " show" : ""}`}>
          &#10003; Logged &mdash; saved to your session history.
        </div>
      </div>
    </section>
  );
}
