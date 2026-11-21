"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export async function post<T = unknown>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong. Try again.");
  return data as T;
}

/** Runs an async action with busy and error state, then refreshes server data. */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, refresh = true) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (refresh) router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p className="alert" role="alert">
      {error}
    </p>
  ) : null;
}

export function LoginForm() {
  const router = useRouter();
  const [pass, setPass] = useState("");
  const { busy, error, run } = useAction();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => post("/api/console/login", { passcode: pass }), false)) {
          router.replace("/console");
          router.refresh();
        }
      }}
    >
      <label className="field">
        <span className="field__label">Passcode</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" required />
      </label>
      <ErrorLine error={error} />
      <button className="btn btn--primary" type="submit" disabled={busy || !pass} aria-busy={busy}>
        Enter the booth
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

export function PrintButton() {
  return (
    <button type="button" className="btn btn--primary" onClick={() => window.print()}>
      Print
    </button>
  );
}
