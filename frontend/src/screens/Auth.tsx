import { useState, type FormEvent } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import { navigate } from "../lib/navigation";
import { errorMessage } from "../lib/api";

export default function Auth({ registering }: { registering: boolean }) {
  const { user, accountsAvailable, login, register, startDevice } = useWorkspace();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (registering && password !== confirmation) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (registering) await register(name.trim(), email.trim().toLowerCase(), password);
      else await login(email.trim().toLowerCase(), password);
      setPassword("");
      setConfirmation("");
      navigate("dashboard");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen auth-screen">
      <div className="auth-intro">
        <div className="eyebrow">YOUR SPACE TO MAKE PROGRESS</div>
        <h1 className="page-title">
          {registering ? "Make room for your next chapter." : "Welcome back to your flow."}
        </h1>
        <p className="page-sub">
          Keep your flows, study sessions, and reflections together in your private account.
        </p>
        <div className="auth-benefit card">
          <span aria-hidden="true">↗</span>
          <div>
            <h2>A little structure. Steady progress.</h2>
            <p className="muted">
              Pick up your saved workspace when you return. Your account workspace is separate from
              anything saved only in this browser.
            </p>
          </div>
        </div>
      </div>
      <div className="card editor-panel auth-panel">
        {user ? (
          <>
            <h2>You’re logged in, {user.name}.</h2>
            <p className="muted">{user.email}</p>
            <button className="btn" onClick={() => navigate("dashboard")}>
              Open your workspace
            </button>
          </>
        ) : (
          <>
            <h2>{registering ? "Create your account" : "Log in to Methodica"}</h2>
            <p className="muted">
              {registering
                ? "Start with your name, email, and a password."
                : "A small step back into learning."}
            </p>
            {accountsAvailable === false && (
              <p className="feedback" role="status">
                Accounts are being set up. You can continue with a device workspace for now.
              </p>
            )}
            {accountsAvailable === null && <p role="status">Checking account service…</p>}
            <form className="auth-form" onSubmit={(event) => void submit(event)}>
              <fieldset disabled={busy || accountsAvailable !== true}>
                {registering && (
                  <label>
                    Your name
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={80}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                )}
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={registering ? "new-password" : "current-password"}
                    required
                    minLength={registering ? 12 : 1}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-describedby={registering ? "password-help" : undefined}
                  />
                </label>
                {registering && (
                  <p className="muted" id="password-help">
                    Use 12–128 characters. A few unrelated words make a strong passphrase.
                  </p>
                )}
                {registering && (
                  <label>
                    Confirm password
                    <input
                      name="confirmation"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      maxLength={128}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                  </label>
                )}
                <label className="auth-show">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(event) => setShowPassword(event.target.checked)}
                  />
                  Show password
                </label>
                {error && (
                  <p className="feedback" role="alert">
                    {error}
                  </p>
                )}
                <button className="btn auth-submit" type="submit">
                  {busy ? "Please wait…" : registering ? "Create account" : "Log in"}
                </button>
              </fieldset>
            </form>
            <p className="auth-switch">
              {registering ? "Already have an account?" : "New to Methodica?"}{" "}
              <button
                className="text-btn"
                disabled={busy}
                onClick={() => navigate(registering ? "login" : "register")}
              >
                {registering ? "Log in" : "Create an account"}
              </button>
            </p>
          </>
        )}
        <div className="auth-device">
          <p className="muted">Prefer to start on this device?</p>
          <button
            className="btn ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await startDevice();
                navigate("dashboard");
              } catch (cause) {
                setError(errorMessage(cause));
              } finally {
                setBusy(false);
              }
            }}
          >
            Continue on this device
          </button>
        </div>
      </div>
    </section>
  );
}
