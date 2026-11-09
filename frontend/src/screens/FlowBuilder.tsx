import { useState, type FormEvent } from "react";
import type { StudyBlock, StudyFlow, StudyType } from "../types";
import { useWorkspace } from "../lib/useWorkspace";
import { errorMessage } from "../lib/api";
import { loadPrefs } from "../lib/preferences";
import { navigate } from "../lib/navigation";
import { clearDraft, draftKey, isFlowDraft, readDraft, writeDraft } from "../lib/drafts";
import { useUnsavedChanges } from "../lib/useUnsavedChanges";

function newFlow(technique?: StudyType): StudyFlow {
  return {
    id: crypto.randomUUID(),
    title: technique ? `${technique.title} flow` : "",
    tag: "",
    totalMinutes: 0,
    blocks: [
      {
        id: crypto.randomUUID(),
        title: technique?.title || "Focused practice",
        type: technique?.type || "focus",
        studyTypeId: technique?.id || "focus",
        durationMinutes: technique?.suggestedMinutes || loadPrefs().sessionDuration,
      },
    ],
  };
}

export default function FlowBuilder() {
  const { data, studyTypes, mode, user, saveFlow, deleteFlow } = useWorkspace();
  const storageKey = draftKey(mode === "device" ? "device" : `account-${user?.id}`, "builder");
  const [restored] = useState(() => readDraft(storageKey, isFlowDraft));
  const [draft, setDraft] = useState<StudyFlow>(
    () =>
      restored?.flow ||
      newFlow(
        studyTypes.find(
          (item) =>
            item.id ===
            new URLSearchParams(window.location.hash.split("?")[1] || "").get("technique")
        )
      )
  );
  const [isNew, setIsNew] = useState(restored?.isNew ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    restored
      ? "Your unsaved flow was restored from this tab. Save it to keep it in your workspace."
      : ""
  );
  const [dirty, setDirty] = useState(!!restored);
  const [draftError, setDraftError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const total = draft.blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  useUnsavedChanges(dirty);

  function update(change: Partial<StudyFlow>) {
    const next = { ...draft, ...change };
    setDraft(next);
    setDraftError(
      writeDraft(storageKey, { flow: next, isNew })
        ? ""
        : "This browser cannot keep a recovery draft. Keep this page open until your flow saves."
    );
    setDirty(true);
    setMessage("");
  }
  function updateBlock(id: string, change: Partial<StudyBlock>) {
    update({
      blocks: draft.blocks.map((block) => (block.id === id ? { ...block, ...change } : block)),
    });
  }
  function edit(flow?: StudyFlow) {
    if (dirty && !window.confirm("Discard unsaved changes to this flow?")) return;
    setDraft(flow ? structuredClone(flow) : newFlow());
    setIsNew(!flow);
    setError("");
    setMessage("");
    setDirty(false);
    setPendingDelete(null);
    clearDraft(storageKey);
    setDraftError("");
  }
  function move(index: number, offset: number) {
    reorder(index, index + offset);
  }
  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= draft.blocks.length) return;
    const blocks = [...draft.blocks];
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    update({ blocks });
    setAnnouncement(`${moved.title} moved to block ${to + 1} of ${blocks.length}.`);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await saveFlow({ ...draft, totalMinutes: total }, isNew);
      setDraft(structuredClone(saved));
      setIsNew(false);
      setDirty(false);
      clearDraft(storageKey);
      setDraftError("");
      setMessage("Flow saved. It is ready in your study timer.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await deleteFlow(id);
      setPendingDelete(null);
      if (draft.id === id) {
        setDraft(newFlow());
        setIsNew(true);
        setDirty(false);
        clearDraft(storageKey);
      }
      setMessage("Flow deleted. Your session history is preserved.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen">
      <div className="eyebrow">YOUR STUDY TOOLKIT</div>
      <div className="page-heading">
        <div>
          <h1 className="page-title">Make a little structure.</h1>
          <p className="page-sub">Turn a study goal into a sequence you can actually follow.</p>
        </div>
        <button className="btn ghost" disabled={busy} onClick={() => edit()}>
          + New flow
        </button>
      </div>
      <div className="builder-layout">
        <aside className="card library-panel">
          <div className="panel-heading">
            <h2>Your flows</h2>
            <span className="tag">{data?.flows.length || 0}</span>
          </div>
          {!data?.flows.length && (
            <p className="muted">Your first flow starts here. Add a block, then save it.</p>
          )}
          {data?.flows.map((flow) => (
            <div
              className={`library-item${draft.id === flow.id && !isNew ? " selected" : ""}`}
              key={flow.id}
            >
              <button className="library-select" disabled={busy} onClick={() => edit(flow)}>
                <b>{flow.title}</b>
                <span>
                  {flow.tag} · {flow.totalMinutes} min · {flow.blocks.length} blocks
                </span>
              </button>
              {pendingDelete === flow.id ? (
                <div className="inline-actions">
                  <span>Delete this flow?</span>
                  <button
                    className="btn ghost"
                    disabled={busy}
                    onClick={() => void remove(flow.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="btn ghost"
                    disabled={busy}
                    onClick={() => setPendingDelete(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setPendingDelete(flow.id)}
                  aria-label={`Delete ${flow.title}`}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </aside>
        <form className="card editor-panel" onSubmit={(event) => void submit(event)}>
          <div className="panel-heading">
            <h2>{isNew ? "Create a flow" : "Edit flow"}</h2>
            <span className="tag">{total} min total</span>
          </div>
          <fieldset disabled={busy}>
            <div className="form-grid">
              <label>
                Flow name
                <input
                  required
                  maxLength={120}
                  value={draft.title}
                  onChange={(event) => update({ title: event.target.value })}
                  placeholder="e.g. Biology midterm prep"
                />
              </label>
              <label>
                Subject
                <input
                  required
                  maxLength={60}
                  value={draft.tag}
                  onChange={(event) => update({ tag: event.target.value })}
                  placeholder="e.g. Biology"
                />
              </label>
            </div>
            <p id="block-order-help" className="muted">
              Drag a block number to change the order, or use Move up and Move down.
            </p>
            <p className="sr-only" role="status">
              {announcement}
            </p>
            <div className="block-list" role="list" aria-label="Study blocks">
              {draft.blocks.map((block, index) => (
                <div
                  className={`block-editor${draggedId === block.id ? " dragging" : ""}${dropTarget === block.id && draggedId !== block.id ? " drop-target" : ""}`}
                  key={block.id}
                  role="listitem"
                  onDragOver={(event) => {
                    if (!draggedId || busy) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropTarget(block.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedId && !busy)
                      reorder(
                        draft.blocks.findIndex((item) => item.id === draggedId),
                        index
                      );
                    setDraggedId(null);
                    setDropTarget(null);
                  }}
                >
                  <button
                    type="button"
                    className="block-number drag-handle"
                    draggable={!busy}
                    aria-label={`Drag block ${index + 1}`}
                    aria-describedby="block-order-help"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", block.id);
                      setDraggedId(block.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTarget(null);
                    }}
                  >
                    {String(index + 1).padStart(2, "0")} ⠿
                  </button>
                  <div className="block-fields">
                    <label>
                      Block name
                      <input
                        required
                        maxLength={120}
                        value={block.title}
                        onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        Technique
                        <select
                          value={block.studyTypeId || block.type}
                          onChange={(event) => {
                            const technique = studyTypes.find(
                              (item) => item.id === event.target.value
                            );
                            if (technique)
                              updateBlock(block.id, {
                                studyTypeId: technique.id,
                                type: technique.type,
                                title: technique.title,
                                durationMinutes:
                                  technique.type === "break"
                                    ? loadPrefs().breakDuration
                                    : technique.suggestedMinutes,
                              });
                          }}
                        >
                          {studyTypes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Minutes
                        <input
                          type="number"
                          required
                          min={1}
                          max={120}
                          step={1}
                          value={block.durationMinutes || ""}
                          onChange={(event) =>
                            updateBlock(block.id, { durationMinutes: Number(event.target.value) })
                          }
                        />
                      </label>
                    </div>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="text-button"
                        disabled={index === 0}
                        aria-label={`Move block ${index + 1} up`}
                        onClick={() => move(index, -1)}
                      >
                        ↑ Move up
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={index === draft.blocks.length - 1}
                        aria-label={`Move block ${index + 1} down`}
                        onClick={() => move(index, 1)}
                      >
                        ↓ Move down
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={draft.blocks.length === 1}
                        aria-label={`Remove block ${index + 1}`}
                        onClick={() =>
                          update({ blocks: draft.blocks.filter((item) => item.id !== block.id) })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn ghost add-block"
              disabled={draft.blocks.length >= 20}
              onClick={() =>
                update({
                  blocks: [
                    ...draft.blocks,
                    {
                      id: crypto.randomUUID(),
                      title: "Active recall",
                      type: "recall",
                      studyTypeId: "recall",
                      durationMinutes: 10,
                    },
                  ],
                })
              }
            >
              + Add study block
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={draft.blocks.length >= 20}
              onClick={() =>
                update({
                  blocks: [
                    ...draft.blocks,
                    {
                      id: crypto.randomUUID(),
                      title: "Rest break",
                      type: "break",
                      studyTypeId: "break",
                      durationMinutes: loadPrefs().breakDuration,
                    },
                  ],
                })
              }
            >
              + Add rest break
            </button>
            <div className="editor-footer">
              <span className="muted">
                {dirty
                  ? "Unsaved changes"
                  : isNew
                    ? "Start with one small goal"
                    : "Saved to your workspace"}
              </span>
              <button className="btn" type="submit">
                {busy ? "Saving…" : "Save flow"}
              </button>
            </div>
          </fieldset>
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          {draftError && (
            <p className="feedback" role="alert">
              {draftError}
            </p>
          )}
          {message && (
            <p className="feedback" role="status">
              {message}{" "}
              <button className="text-button" type="button" onClick={() => navigate("timer")}>
                Open timer →
              </button>
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
