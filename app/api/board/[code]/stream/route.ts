import { getEventByCode, getEventById, snapshot } from "@/lib/game";

export const dynamic = "force-dynamic";

/** Server-Sent Events: sends a snapshot on connect and again whenever the event's version changes. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const event = getEventByCode((await ctx.params).code);
  if (!event) return new Response(JSON.stringify({ error: "No event with that code." }), { status: 404 });

  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let beat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let last = -1;
      const send = (data: string) => controller.enqueue(enc.encode(data));
      const close = () => {
        clearInterval(timer);
        clearInterval(beat);
        try {
          controller.close();
        } catch {}
      };
      const tick = () => {
        try {
          const cur = getEventById(event.id);
          if (!cur) return close();
          if (cur.version !== last) {
            last = cur.version;
            send(`data: ${JSON.stringify(snapshot(cur))}\n\n`);
          }
        } catch {
          close();
        }
      };
      send("retry: 2000\n\n");
      tick();
      timer = setInterval(tick, 1000);
      beat = setInterval(() => {
        try {
          send(": keep-alive\n\n");
        } catch {
          close();
        }
      }, 20000);
      req.signal.addEventListener("abort", close);
    },
    cancel() {
      clearInterval(timer);
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
