import { eventVersion, frame, getEventById, type Frame } from "./game";
import { DEMO_CODE, simulateStep } from "./seed";

/**
 * One broadcaster per event. It reads a single integer (events.version) every TICK_MS while
 * anyone is subscribed, builds the frame once per version, and hands it to every subscriber.
 * Bursts of writes inside one tick collapse into one broadcast.
 */
const TICK_MS = 400;

type Listener = (f: Frame | null) => void;

type Channel = {
  eventId: number;
  listeners: Set<Listener>;
  last: number;
  timer: ReturnType<typeof setInterval>;
  sim?: ReturnType<typeof setTimeout>;
};

const g = globalThis as unknown as { __questopsBus?: Map<number, Channel> };
const channels = (g.__questopsBus ??= new Map());

function tick(ch: Channel) {
  let v: number | undefined;
  try {
    v = eventVersion(ch.eventId);
  } catch {
    return;
  }
  if (v === undefined) {
    for (const l of ch.listeners) l(null);
    return close(ch);
  }
  if (v === ch.last) return;
  ch.last = v;
  const f = frame(ch.eventId);
  for (const l of ch.listeners) {
    try {
      l(f);
    } catch {}
  }
}

function close(ch: Channel) {
  clearInterval(ch.timer);
  clearTimeout(ch.sim);
  channels.delete(ch.eventId);
}

function scheduleSim(ch: Channel) {
  ch.sim = setTimeout(() => {
    if (!channels.has(ch.eventId)) return;
    try {
      simulateStep(ch.eventId);
    } catch (e) {
      console.error("demo simulator", e);
    }
    scheduleSim(ch);
  }, 4000 + Math.random() * 4000);
}

/** Subscribe to an event's frames. The listener is called with the current frame at once. */
export function subscribe(eventId: number, listener: Listener): () => void {
  let ch = channels.get(eventId);
  if (!ch) {
    const created: Channel = { eventId, listeners: new Set(), last: eventVersion(eventId) ?? -1, timer: setInterval(() => tick(created), TICK_MS) };
    ch = created;
    channels.set(eventId, ch);
    if (getEventById(eventId)?.code === DEMO_CODE) scheduleSim(ch);
  }
  ch.listeners.add(listener);
  listener(frame(eventId));
  const own = ch;
  return () => {
    own.listeners.delete(listener);
    if (!own.listeners.size) close(own);
  };
}

/** For diagnostics: how many loops and listeners are running. */
export function busStats() {
  return [...channels.values()].map((c) => ({ eventId: c.eventId, listeners: c.listeners.size, simulating: Boolean(c.sim) }));
}
