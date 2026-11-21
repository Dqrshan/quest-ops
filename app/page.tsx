import Link from "next/link";
import { Brand } from "@/components/Brand";
import { KindIcon, kindLabel } from "@/components/icons";
import { LiveBoardBand } from "@/components/LiveBoard";
import { QuestLine } from "@/components/QuestLine";
import { builtin } from "@/lib/ai";
import { findPlayerByName, listQuests, playerView, questReach, snapshot } from "@/lib/game";
import { DEMO_CODE, ensureDemo } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default function Home() {
  const event = ensureDemo();
  const snap = snapshot(event);
  const quests = listQuests(event.id);
  const reach = questReach(event.id);
  const ade = findPlayerByName(event.id, "Ade");
  const view = ade ? playerView(event, ade) : null;
  const sample = builtin({ eventName: "Demo Night", venue: "", audience: "", vibe: "", count: 6, difficulty: "medium", includeTeam: true });

  return (
    <>
      <header className="pill-nav">
        <div className="pill-nav__bar">
          <Brand />
          <nav className="pill-nav__links" aria-label="Main">
            <a href="#how">How it runs</a>
            <a href="#board">Live board</a>
            <a href="#phone">On a phone</a>
          </nav>
          <Link className="btn btn--primary" href="/console">
            Start an event
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <div className="hero__head">
              <h1>Make your event a game.</h1>
              <p className="lead">Quests, QR stations, teams and a live board, run from one console.</p>
              <div className="hero__actions">
                <Link className="btn btn--primary" href="/console">
                  Start an event
                </Link>
                <Link className="btn btn--ghost" href={`/play/${DEMO_CODE}`}>
                  Play the demo
                </Link>
              </div>
            </div>

            <figure className="map" aria-label={`The ${snap.event.name} quest line`} style={{ ["--n" as string]: quests.length }}>
              <ol className="map__stops">
                {quests.map((q) => (
                  <li key={q.id} className={`map__stop ${q.position === 1 ? "map__stop--first" : ""}`}>
                    <span className="map__mark num">{q.position}</span>
                    <span className="map__title">{q.title}</span>
                    <span className="map__meta">
                      <span className="map__kind">
                        <KindIcon kind={q.kind} size={14} /> {kindLabel[q.kind]}
                      </span>
                      <span className="num">{q.points} points, {reach.get(q.id) ?? 0} reached</span>
                    </span>
                  </li>
                ))}
              </ol>
              <figcaption className="map__foot">
                Demo Night, {snap.totals.players} generated players.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="section" id="how" aria-labelledby="how-h">
          <div className="container">
            <h2 id="how-h">Four moves to a live event.</h2>
            <ol className="steps">
              <li className="steps__plate">
                <span className="steps__fig num" aria-hidden="true">1</span>
                <div className="stack">
                  <h3>Describe it</h3>
                  <p>The event, the crowd, the mood.</p>
                </div>
              </li>
              <li className="steps__plate">
                <span className="steps__fig num" aria-hidden="true">2</span>
                <div className="stack">
                  <h3>Review the route</h3>
                  <p>AI drafts. You edit.</p>
                </div>
              </li>
              <li className="steps__plate">
                <span className="steps__fig num" aria-hidden="true">3</span>
                <div className="stack">
                  <h3>Print the codes</h3>
                  <p>One QR card per station.</p>
                </div>
              </li>
              <li className="steps__plate">
                <span className="steps__fig num" aria-hidden="true">4</span>
                <div className="stack">
                  <h3>Open the doors</h3>
                  <p>Players join with a name.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section" aria-labelledby="route-h">
          <div className="container split">
            <div className="split__head">
              <h2 id="route-h">Describe the night. Get the route.</h2>
              <p className="lead">Three station types cover most events: reach it, answer it, or bring your team.</p>
            </div>
            <div>
              <ol className="routes">
                {sample.map((q, i) => (
                  <li key={q.title}>
                    <span className="routes__n num">{i + 1}</span>
                    <span className="routes__t">{q.title}</span>
                    <span className="routes__k">
                      <KindIcon kind={q.kind} size={14} /> {kindLabel[q.kind]}
                    </span>
                    <span className="routes__p num">{q.points}</span>
                  </li>
                ))}
              </ol>
              <p className="routes__note">Sample route from the built-in generator. Add an Anthropic or OpenAI key and it writes for your venue.</p>
            </div>
          </div>
        </section>

        <section className="section section--ink" id="board" aria-labelledby="board-h">
          <div className="container split">
            <div className="split__head">
              <h2 id="board-h">The venue screen runs itself.</h2>
              <p className="lead">Every scan lands on the board within a second. Put it on a projector and walk away.</p>
            </div>
            <LiveBoardBand code={event.code} initial={snap} />
          </div>
        </section>

        <section className="section" id="phone" aria-labelledby="phone-h">
          <div className="container split split--flip">
            <div className="stack stack--lg">
              <h2 id="phone-h">One name. Then walk the line.</h2>
              <ul className="facts-list">
                <li>
                  <h3>Scan with any camera</h3>
                  <p>Each station QR opens the game on the player&apos;s own phone.</p>
                </li>
                <li>
                  <h3>Answers stay on the server</h3>
                  <p>Quiz answers never reach the browser, so they cannot be read off the page.</p>
                </li>
                <li>
                  <h3>Teams earn together</h3>
                  <p>A team station pays a bonus once enough teammates have scanned it.</p>
                </li>
              </ul>
            </div>
            {view ? (
              <div className="phone" role="img" aria-label="The player view: a score and a line of stations">
                <div className="phone__head">
                  <p>
                    <strong>{snap.event.name}</strong>
                    {view.me.name}, {view.me.team}
                  </p>
                  <span className="phone__score num">{view.me.score}</span>
                </div>
                <QuestLine quests={view.quests} />
              </div>
            ) : null}
          </div>
        </section>

        <section className="close" aria-labelledby="close-h">
          <div className="container">
            <div className="close__letter">
              <h2 id="close-h">Your next event, played.</h2>
              <p className="lead">Open the console, draft a route and print the first card. The demo event is already in there to poke at.</p>
              <div className="row-actions">
                <Link className="btn btn--primary" href="/console">
                  Start an event
                </Link>
                <Link className="btn btn--ghost" href={`/board/${DEMO_CODE}`}>
                  See the venue screen
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="container foot__in">
          <Brand />
          <nav aria-label="Footer">
            <Link href="/console">Console</Link>
            <Link href={`/play/${DEMO_CODE}`}>Demo on a phone</Link>
            <Link href={`/board/${DEMO_CODE}`}>Demo venue screen</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
