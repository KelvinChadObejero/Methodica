import { useState, type FormEvent } from "react";
import "./crud-demo.css";

type Kind = "flows" | "users";
type Row = { flowId?: number; userId: number; title?: string; description?: string | null; isPublic?: boolean; name?: string; email?: string; role?: string; createdAt: string };

const endpoints: Record<Kind, string> = {
  flows: "http://127.0.0.1:8080/api/flows",
  users: "http://127.0.0.1:8081/api/users",
};

export default function CrudDemo() {
  const [kind, setKind] = useState<Kind>("flows");
  const [rows, setRows] = useState<Row[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [flow, setFlow] = useState({ userId: "1", title: "", description: "", isPublic: false });
  const [user, setUser] = useState({ name: "", email: "", password: "", role: "STUDENT" });
  const [status, setStatus] = useState("Choose an entity and load its records.");
  const [busy, setBusy] = useState(false);

  async function request(path: string, options?: RequestInit) {
    const response = await fetch(endpoints[kind] + path, options);
    if (!response.ok) {
      let detail = "";
      try { detail = (await response.json()).message || ""; } catch { /* response may not be JSON */ }
      throw new Error(`${response.status}${detail ? `: ${detail}` : ""}`);
    }
    return response.status === 204 ? null : response.json();
  }
  async function load() {
    setBusy(true);
    try { setRows(await request("")); setStatus("Connected. Records loaded from the Spring Boot application."); }
    catch (error) { setRows([]); setStatus(`Could not load records: ${message(error)}. Check that the local service is running and this site is an allowed origin.`); }
    finally { setBusy(false); }
  }
  function message(error: unknown) { return error instanceof Error ? error.message : "Connection failed"; }
  function reset() {
    setEditId(null);
    setFlow({ userId: "1", title: "", description: "", isPublic: false });
    setUser({ name: "", email: "", password: "", role: "STUDENT" });
  }
  function selectKind(next: Kind) {
    setKind(next); setRows([]); reset(); setStatus("Select Load records to connect to the local service.");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    const body = kind === "flows"
      ? { ...flow, userId: Number(flow.userId) }
      : { ...user, password: user.password || null };
    try {
      await request(editId === null ? "" : `/${editId}`, {
        method: editId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const loaded = await request(""); setRows(loaded); setStatus(editId === null ? "Record created." : "Record updated."); reset();
    } catch (error) { setStatus(`Could not save: ${message(error)}. Check the form and local service.`); }
    finally { setBusy(false); }
  }
  function edit(row: Row) {
    if (kind === "flows") {
      setEditId(row.flowId ?? null);
      setFlow({ userId: String(row.userId), title: row.title ?? "", description: row.description ?? "", isPublic: row.isPublic ?? false });
    } else {
      setEditId(row.userId);
      setUser({ name: row.name ?? "", email: row.email ?? "", password: "", role: row.role ?? "STUDENT" });
    }
    setStatus("Editing record. Save your changes below.");
  }
  async function remove(id: number) {
    if (!window.confirm(`Delete record ${id}?`)) return;
    setBusy(true);
    try { await request(`/${id}`, { method: "DELETE" }); setRows(await request("")); setStatus("Record deleted."); if (editId === id) reset(); }
    catch (error) { setStatus(`Could not delete: ${message(error)}`); }
    finally { setBusy(false); }
  }

  return <div className="crud-demo">
    <header><p className="crud-eyebrow">CLASSROOM DEMO</p><h1>Explore the backend</h1>
      <p>Create, view, update and delete sample records using your Spring Boot assignments.</p></header>
    <div className="crud-notice"><strong>Connect your workstation</strong><p>Start the Study Flow or User Spring Boot application on this computer, then load its records. The applications store separate demo data locally. Use sample details only.</p></div>
    <div className="crud-tabs" aria-label="Choose an entity">
      <button type="button" className={kind === "flows" ? "selected" : ""} onClick={() => selectKind("flows")}>Study flows</button>
      <button type="button" className={kind === "users" ? "selected" : ""} onClick={() => selectKind("users")}>Users</button>
    </div>
    <p className="crud-status" role="status">{status}</p>
    <div className="crud-grid">
      <section className="crud-card"><div className="crud-heading"><div><h2>{kind === "flows" ? "Study flows" : "Users"}</h2><p>Saved records on this workstation</p></div><button type="button" className="crud-secondary" onClick={load} disabled={busy}>Load records</button></div>
        {rows.length === 0 ? <p className="crud-empty">No records to display. Load records or create one.</p> : <div className="crud-list">{rows.map((row) => {
          const id = kind === "flows" ? row.flowId! : row.userId;
          return <article className="crud-row" key={id}><div><strong>{kind === "flows" ? row.title : row.name}</strong><p>#{id} · {kind === "flows" ? `User ${row.userId} · ${row.isPublic ? "Public" : "Private"}` : `${row.email} · ${row.role}`}</p></div><div className="crud-actions"><button type="button" onClick={() => edit(row)} disabled={busy}>Edit</button><button type="button" onClick={() => remove(id)} disabled={busy}>Delete</button></div></article>;
        })}</div>}
      </section>
      <section className="crud-card"><h2>{editId === null ? "Create" : `Edit #${editId}`}</h2><p>{kind === "flows" ? "A study flow from your ERD" : "A user from your ERD"}</p>
        <form className="crud-form" onSubmit={save}>
          {kind === "flows" ? <>
            <label>Title<input required maxLength={200} value={flow.title} onChange={(e) => setFlow({ ...flow, title: e.target.value })} /></label>
            <label>User ID<input required type="number" min="1" step="1" value={flow.userId} onChange={(e) => setFlow({ ...flow, userId: e.target.value })} /></label>
            <label>Description<textarea maxLength={2000} value={flow.description} onChange={(e) => setFlow({ ...flow, description: e.target.value })} /></label>
            <label className="crud-check"><input type="checkbox" checked={flow.isPublic} onChange={(e) => setFlow({ ...flow, isPublic: e.target.checked })} /> Public</label>
          </> : <>
            <label>Name<input required maxLength={100} value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} /></label>
            <label>Email<input required type="email" maxLength={254} value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} /></label>
            <label>Password {editId !== null && <small>(leave blank to keep current password)</small>}<input type="password" minLength={8} maxLength={72} required={editId === null} value={user.password} onChange={(e) => setUser({ ...user, password: e.target.value })} /></label>
            <label>Role<select value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}><option>STUDENT</option><option>MENTOR</option><option>ADMIN</option></select></label>
          </>}
          <div className="crud-actions"><button className="crud-primary" disabled={busy} type="submit">{editId === null ? "Create record" : "Save changes"}</button>{editId !== null && <button className="crud-secondary" type="button" onClick={reset}>Cancel</button>}</div>
        </form>
      </section>
    </div>
  </div>;
}
