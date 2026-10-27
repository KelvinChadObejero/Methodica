import { useState } from "react";
import { useWorkspace } from "../lib/useWorkspace";

export default function StudyTypes() {
  const { studyTypes: items } = useWorkspace();
  const [query, setQuery] = useState("");
  const visible = items.filter((item) =>
    `${item.title} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <section className="screen">
      <div className="eyebrow">YOUR STUDY TOOLKIT</div>
      <h1 className="page-title">Find your next technique.</h1>
      <p className="page-sub">
        A starting toolkit for focused practice, retrieval, and reflection. Combine these blocks in
        your flow builder.
      </p>
      <label className="search-label">
        Search techniques
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try recall or review"
        />
      </label>
      <div className="grid">
        {visible.map((item, index) => (
          <article className="card technique-card" key={item.id}>
            <div className="panel-heading">
              <span className="technique-index">0{index + 1}</span>
              <span className="tag">{item.suggestedMinutes} min suggested</span>
            </div>
            <h2>{item.title}</h2>
            <p className="muted">{item.description}</p>
            <p>{item.instructions}</p>
            <button
              className="btn ghost"
              onClick={() => {
                window.location.hash = `builder?technique=${encodeURIComponent(item.id)}`;
              }}
            >
              Use this technique →
            </button>
          </article>
        ))}
      </div>
      {!visible.length && <p className="feedback">No techniques match that search.</p>}
    </section>
  );
}
