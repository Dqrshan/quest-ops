import Link from "next/link";
import { notFound } from "next/navigation";
import { EventHeader, GeneratorPanel, LiveTab, PlayersTab, QuestList, SettingsTab, type EventInfo } from "@/components/console/EventConsole";
import { getEventById, listQuests, liveView, snapshot } from "@/lib/game";
import { requireOrganizer } from "../gate";

export const metadata = { title: "Event" };

const TABS = [
  ["live", "Live"],
  ["stations", "Stations"],
  ["players", "Players"],
  ["settings", "Settings"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireOrganizer();
  const event = getEventById(Number((await params).id));
  if (!event) notFound();
  const want = (await searchParams).tab;
  const quests = listQuests(event.id);
  const tab: Tab = TABS.some(([t]) => t === want) ? (want as Tab) : quests.length ? "live" : "stations";
  const info: EventInfo = { id: event.id, code: event.code, name: event.name, venue: event.venue, blurb: event.blurb, status: event.status, paused: event.paused === 1 };

  return (
    <div className="stack stack--xl">
      <EventHeader event={info} stations={quests.length} />
      <nav className="booth__tabs" aria-label="Event sections">
        {TABS.map(([t, label]) => (
          <Link key={t} href={`/console/${event.id}?tab=${t}`} aria-current={t === tab ? "page" : undefined} scroll={false}>
            {label}
            {t === "stations" ? <span className="num"> {quests.length}</span> : null}
          </Link>
        ))}
      </nav>
      {tab === "live" ? <LiveTab event={info} initialSnap={snapshot(event)} initialLive={liveView(event.id)} /> : null}
      {tab === "players" ? <PlayersTab event={info} initialSnap={snapshot(event)} initialLive={liveView(event.id)} /> : null}
      {tab === "settings" ? <SettingsTab event={info} /> : null}
      {tab === "stations" ? (
        <div className="console__cols">
          <section aria-labelledby="q-h" className="stack stack--lg">
            <h2 id="q-h" className="console__h2">Stations, in route order</h2>
            <QuestList eventId={event.id} quests={quests} />
          </section>
          <aside aria-labelledby="g-h" className="stack stack--lg panel">
            <h2 id="g-h" className="console__h2">Draft with AI</h2>
            <GeneratorPanel eventId={event.id} venue={event.venue} hasStory={Boolean(event.blurb)} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
