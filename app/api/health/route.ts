import { busStats } from "@/lib/bus";

export const dynamic = "force-dynamic";

/** Liveness plus how many event loops and live connections this server holds. */
export function GET() {
  const events = busStats();
  return Response.json(
    { ok: true, loops: events.length, connections: events.reduce((n, e) => n + e.listeners, 0), events },
    { headers: { "cache-control": "no-store" } },
  );
}
