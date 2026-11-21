import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { EventControls, GeneratorPanel, QuestList } from "@/components/console/EventConsole";
import { getEventById, listQuests, snapshot } from "@/lib/game";
import { originFrom } from "@/lib/http";
import { requireOrganizer } from "../gate";

export const metadata = { title: "Event" };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrganizer();
  const event = getEventById(Number((await params).id));
  if (!event) notFound();
  const quests = listQuests(event.id);
  const snap = snapshot(event, 5);
  const o = originFrom(await headers());
  return (
    <div className="stack stack--xl">
      <EventControls
        event={{ id: event.id, code: event.code, name: event.name, venue: event.venue, blurb: event.blurb, status: event.status }}
        totals={snap.totals}
        joinUrl={`${o}/play/${event.code}`}
      />
      <div className="console__cols">
        <section aria-labelledby="q-h" className="stack stack--lg">
          <div className="between">
            <h2 id="q-h" className="console__h2">Stations</h2>
            {quests.length ? (
              <Link className="btn btn--ghost btn--sm" href={`/console/${event.id}/print`}>
                Print QR sheets
              </Link>
            ) : null}
          </div>
          <QuestList eventId={event.id} quests={quests} />
        </section>
        <aside aria-labelledby="g-h" className="stack stack--lg">
          <h2 id="g-h" className="console__h2">Draft with AI</h2>
          <GeneratorPanel eventId={event.id} defaults={{ venue: event.venue }} />
        </aside>
      </div>
    </div>
  );
}
