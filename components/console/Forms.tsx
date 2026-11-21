"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export async function post<T = unknown>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

export function LoginForm() {
  const router = useRouter();
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await post("/api/console/login", { passcode: pass });
          router.replace("/console");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not sign in.");
          setBusy(false);
        }
      }}
    >
      <label className="field">
        <span className="field__label">Passcode</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" required />
      </label>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <button className="btn btn--primary" type="submit" disabled={busy || !pass} aria-busy={busy}>
        Sign in
      </button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="linklike"
      onClick={async () => {
        await post("/api/console/logout", {});
        router.replace("/console/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

export function NewEventForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", venue: "", blurb: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const d = await post<{ event: { id: number } }>("/api/console/events", f);
          router.push(`/console/${d.event.id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not create the event.");
          setBusy(false);
        }
      }}
    >
      <label className="field">
        <span className="field__label">Event name</span>
        <input value={f.name} onChange={set("name")} required maxLength={80} />
      </label>
      <label className="field">
        <span className="field__label">Venue</span>
        <input value={f.venue} onChange={set("venue")} maxLength={120} />
      </label>
      <label className="field">
        <span className="field__label">What is it about?</span>
        <textarea value={f.blurb} onChange={set("blurb")} rows={3} maxLength={400} />
      </label>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <button className="btn btn--primary" type="submit" disabled={busy || !f.name.trim()} aria-busy={busy}>
        Create event
      </button>
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" className="btn btn--primary" onClick={() => window.print()}>
      Print
    </button>
  );
}
