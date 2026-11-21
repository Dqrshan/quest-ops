import { NextResponse } from "next/server";
import { GameError } from "./game";
import { isOrganizer } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

/** Reject cross-site form posts: if an Origin header is sent it must match the Host. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function handler<A extends unknown[]>(
  opts: { organizer?: boolean },
  fn: (req: Request, ...args: A) => Promise<Response> | Response,
) {
  return async (req: Request, ...args: A): Promise<Response> => {
    try {
      if (req.method !== "GET" && !sameOrigin(req)) return json({ error: "Cross-site request refused." }, 403);
      if (opts.organizer && !(await isOrganizer())) return json({ error: "Organizer sign-in required." }, 401);
      return await fn(req, ...args);
    } catch (e) {
      if (e instanceof GameError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Something went wrong on our side." }, 500);
    }
  };
}

export function originFrom(h: { get(name: string): string | null }): string {
  const fixed = process.env.PUBLIC_ORIGIN?.trim().replace(/\/$/, "");
  if (fixed) return fixed;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.|\[::1\]|192\.168\.|10\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
