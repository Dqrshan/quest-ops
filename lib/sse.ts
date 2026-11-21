import { subscribe } from "./bus";
import type { Frame } from "./game";

/**
 * Turn bus frames into a Server-Sent Events response. `render` returns the JSON to send for a frame,
 * or null to skip it. Only the heartbeat runs per connection; the database is read by the bus.
 */
export function sseResponse(req: Request, eventId: number, render: (f: Frame) => unknown): Response {
  const enc = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let beat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        unsubscribe?.();
        clearInterval(beat);
        try {
          controller.close();
        } catch {}
      };
      const send = (s: string) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          close();
        }
      };
      send("retry: 2000\n\n");
      unsubscribe = subscribe(eventId, (f) => {
        if (!f) {
          send("event: gone\ndata: {}\n\n");
          return close();
        }
        const data = render(f);
        if (data !== null && data !== undefined) send(`data: ${JSON.stringify(data)}\n\n`);
      });
      beat = setInterval(() => send(": keep-alive\n\n"), 20_000);
      req.signal.addEventListener("abort", close);
    },
    cancel() {
      unsubscribe?.();
      clearInterval(beat);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
