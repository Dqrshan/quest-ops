import Link from "next/link";
import { listEvents } from "@/lib/game";
import { DEMO_CODE, ensureDemo } from "@/lib/seed";
import { requireOrganizer } from "./gate";

export const metadata = { title: "Events" };

export default async function ConsoleHome() {
  await requireOrganizer();
  ensureDemo();
  const events = listEvents();
  return (
    <div className="stack stack--xl">
      <div className="between between--end">
        <h1 className="console__h1">Tonight&apos;s programme</h1>
        <Link className="btn btn--primary" href="/console/new">
          New event
        </Link>
      </div>
      <ul className="programme">
        {events.map((e) => (
          <li key={e.id}>
            <Link href={`/console/${e.id}`} className="programme__row">
              <span className="programme__name">{e.name}</span>
              <span className="programme__meta">
                <span className="num">{e.quests}</span> stations, <span className="num">{e.players}</span> players
                {e.code === DEMO_CODE ? ", simulated" : ""}
              </span>
              <span className="programme__code num">{e.code}</span>
              <span className={`chip ${e.status === "live" ? (e.paused ? "chip--blood" : "chip--live") : e.status === "ended" ? "chip--blood" : ""}`}>
                {e.status === "live" ? (e.paused ? "Paused" : "Live") : e.status === "ended" ? "Ended" : "Draft"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
