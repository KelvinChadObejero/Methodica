import { useState, type FormEvent } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { errorMessage } from "../lib/api";
import { navigate } from "../lib/navigation";

export default function CommunityHub() {
  const { data, importTemplate, publishFlow } = useWorkspace();
  const [query, setQuery] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [flowId, setFlowId] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const templates =
    data?.templates.filter((item) =>
      `${item.title} ${item.tag} ${item.author}`.toLowerCase().includes(query.trim().toLowerCase())
    ) || [];
  async function importFlow(id: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await importTemplate(id);
      setMessage("Template added to your library. Open the builder to customize it.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function publish(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await publishFlow(flowId, author);
      setPublishing(false);
      setMessage("Template saved to this workspace's collection.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="screen">
      <div className="eyebrow">LEARN FROM EACH OTHER</div>
      <h1 className="page-title">A good flow is worth sharing.</h1>
      <p className="page-sub">
        Browse starter flows and templates saved in this workspace. Import one, then make it your
        own.
      </p>
      <p className="scope-note">
        This is a local template collection. Public accounts, ratings, and moderation are planned
        before a public community launch.
      </p>
      <div className="community-toolbar">
        <label className="search-label">
          Find a template
          <input
            className="search"
            placeholder="Search by subject, title, or author"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          className="btn"
          disabled={busy || !data?.flows.length}
          onClick={() => {
            setPublishing(!publishing);
            setFlowId(data?.flows[0]?.id || "");
          }}
        >
          + Save a template
        </button>
      </div>
      {publishing && (
        <form className="card editor-panel publish-form" onSubmit={(event) => void publish(event)}>
          <h2>Save a flow to your collection</h2>
          <p className="muted">
            This copies the current blocks into your workspace collection. Save again to update the
            template. It does not publish to other people.
          </p>
          <fieldset disabled={busy}>
            <label>
              Study flow
              <select required value={flowId} onChange={(event) => setFlowId(event.target.value)}>
                {data?.flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Display name
              <input
                required
                maxLength={60}
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Your name"
              />
            </label>
            <div className="inline-actions">
              <button className="btn" type="submit">
                {busy ? "Saving…" : "Save template"}
              </button>
              <button className="btn ghost" type="button" onClick={() => setPublishing(false)}>
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {error && (
        <p className="feedback" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
      <div className="grid">
        {templates.map((template) => {
          const imported = data?.flows.some((flow) => flow.sourceTemplateId === template.id);
          return (
            <article className="card tmpl-card" key={template.id}>
              <div className="tmpl-top">
                <span className="tag">{template.tag}</span>
                <span className="muted">{template.totalMinutes} min</span>
              </div>
              <h2 className="tmpl-title">{template.title}</h2>
              <p className="tmpl-meta">By {template.author}</p>
              <ol className="template-blocks">
                {template.blocks.map((block) => (
                  <li key={block.id}>
                    {block.title}
                    <span>{block.durationMinutes}m</span>
                  </li>
                ))}
              </ol>
              <div className="tmpl-foot">
                <span className="tmpl-meta">{template.blocks.length} blocks</span>
                <button
                  className="btn ghost"
                  disabled={busy || imported}
                  onClick={() => void importFlow(template.id)}
                >
                  {imported ? "In your library ✓" : "Import flow"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!templates.length && (
        <div className="card empty-state">
          <h2>No matching templates yet.</h2>
          <p>Try a different search or save your first template.</p>
        </div>
      )}
      <button className="text-button section-link" onClick={() => navigate("builder")}>
        Open your flow library →
      </button>
    </section>
  );
}
