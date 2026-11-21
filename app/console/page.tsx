import Link from "next/link";
import { NewEventForm } from "@/components/console/Forms";
import { listEvents } from "@/lib/game";
import { ensureDemo } from "@/lib/seed";
import { requireOrganizer } from "./gate";

export const metadata = { title: "Events" };

const STATUS = { draft: "Draft", live: "Live", ended: "Ended" } as const;

export default async function ConsoleHome() {
  await requireOrganizer();
  ensureDemo();
  const events = listEvents();
  return (
    <div className="console__cols">
      <section aria-labelledby="events-h" className="stack stack--lg">
        <h1 id="events-h" className="console__h1">Events</h1>
        <ul className="rows">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/console/${e.id}`} className="rows__link">
                <span className="rows__main">
                  <span className="rows__title">{e.name}</span>
                  <span className="rows__sub">
                    {e.quests} stations, {e.players} players, code <span className="num">{e.code}</span>
                  </span>
                </span>
                <span className={`status status--${e.status}`}>{STATUS[e.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <aside aria-labelledby="new-h" className="stack stack--lg">
        <h2 id="new-h" className="console__h2">New event</h2>
        <NewEventForm />
      </aside>
    </div>
  );
}
