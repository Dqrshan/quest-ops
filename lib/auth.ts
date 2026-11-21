import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ORGANIZER_COOKIE = "qo_org";

function passcode(): string | undefined {
  const p = process.env.CONSOLE_PASSCODE?.trim();
  return p ? p : undefined;
}

/** Signed value stored in the cookie; never the passcode itself. */
export function organizerToken(): string | undefined {
  const p = passcode();
  return p ? crypto.createHmac("sha256", p).update("questops:organizer:v1").digest("hex") : undefined;
}

export function passcodeMatches(input: string): boolean {
  const p = passcode();
  if (!p) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(p).digest();
  return crypto.timingSafeEqual(a, b);
}

export type OrganizerState = "open" | "authed" | "locked" | "unconfigured";

export async function organizerState(): Promise<OrganizerState> {
  const token = organizerToken();
  if (!token) return process.env.NODE_ENV === "production" ? "unconfigured" : "open";
  const jar = await cookies();
  const have = jar.get(ORGANIZER_COOKIE)?.value ?? "";
  const ok = have.length === token.length && crypto.timingSafeEqual(Buffer.from(have), Buffer.from(token));
  return ok ? "authed" : "locked";
}

export async function isOrganizer(): Promise<boolean> {
  const s = await organizerState();
  return s === "open" || s === "authed";
}
