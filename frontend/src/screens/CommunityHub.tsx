import { useState } from "react";
import type { StudyFlowTemplate } from "../types";

// Placeholder data — swap for a fetch to the StudyFlow template endpoint
// (GET /api/templates?public=true) once the backend is ready.
const TEMPLATES: StudyFlowTemplate[] = [
  {
    id: "t1",
    title: "STEM Problem-Solving Loop",
    author: "MentorJuan",
    tag: "STEM",
    rating: 4.8,
    usedBy: 240,
  },
  {
    id: "t2",
    title: "History Memorization Track",
    author: "KyleT",
    tag: "Humanities",
    rating: 4.6,
    usedBy: 180,
  },
  {
    id: "t3",
    title: "Thesis Writing Flow",
    author: "MentorAna",
    tag: "Research",
    rating: 4.9,
    usedBy: 95,
  },
  {
    id: "t4",
    title: "Board Exam Review",
    author: "PeerGroup",
    tag: "Review",
    rating: 4.7,
    usedBy: 310,
  },
];

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars">
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}

function TemplateCard({ template }: { template: StudyFlowTemplate }) {
  const [imported, setImported] = useState(false);

  return (
    <div className="card tmpl-card">
      <div className="tmpl-top">
        <span className="tag">{template.tag}</span>
        <Stars rating={template.rating} />
      </div>
      <div>
        <p className="tmpl-title">{template.title}</p>
        <p className="tmpl-meta">
          by {template.author} &middot; {template.rating.toFixed(1)} rating
        </p>
      </div>
      <div className="tmpl-foot">
        <span className="tmpl-meta">Used by {template.usedBy}+ students</span>
        <button className="btn ghost" disabled={imported} onClick={() => setImported(true)}>
          {imported ? "Imported ✓" : "Import"}
        </button>
      </div>
    </div>
  );
}

export default function CommunityHub() {
  const [query, setQuery] = useState("");

  const visible = TEMPLATES.filter((t) =>
    (t.title + t.tag + t.author).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="screen">
      <div className="eyebrow">Should-Have &middot; 02</div>
      <h1 className="page-title">Community hub</h1>
      <p className="page-sub">
        Browse study-flow templates other students and mentors have published, and bring one into
        your own library.
      </p>

      <div className="community-toolbar">
        <input
          className="search"
          placeholder="Search templates by subject or technique..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn">+ Publish a flow</button>
      </div>

      <div className="grid">
        {visible.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    </section>
  );
}
