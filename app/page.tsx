import Link from "next/link";
import { headers } from "next/headers";
import { Brand } from "@/components/Brand";
import { feedLine } from "@/lib/feed";
import { KindIcon, kindLabel } from "@/components/icons";
import { NowShowing } from "@/components/landing/NowShowing";
import { ThreeScreens } from "@/components/landing/ThreeScreens";
import { findPlayerByName, playerView, snapshot } from "@/lib/game";
import { originFrom } from "@/lib/http";
import { joinUrl, qrSvg } from "@/lib/qr";
import { DEMO_CODE, ensureDemo } from "@/lib/seed";

export const dynamic = "force-dynamic";

const REPO = "https://github.com/Dqrshan/quest-ops";

const CONTROLS = [
  ["Announce", "Every phone, every screen."],
  ["Run the clock", "All screens count down."],
  ["Pause play", "Hold scans for a talk."],
  ["Spot the stalled", "Idle for fifteen minutes."],
  ["Adjust points", "Reward the best costume."],
  ["Export results", "Standings as a CSV."],
] as const;

const KINDS = [
  { kind: "scan", name: "Reach it", what: "The player scans the ticket at the station." },
  { kind: "answer", name: "Prove it", what: "They scan, then enter the codeword printed on the sign." },
  { kind: "team", name: "Bring the crew", what: "Enough teammates scan and the whole team earns a bonus." },
] as const;

const FAQ = [
  ["Do players need an app?", "No. A name in the browser."],
  ["Can players read the answers?", "No. Codewords stay on the server."],
  ["How big can an event get?", "Tested at 60 open screens so far."],
  ["What does it need?", "Phones, a laptop, a projector. An AI key is optional."],
] as const;

export default async function Home() {
  const event = ensureDemo();
  const snap = snapshot(event);
  const guest = findPlayerByName(event.id, "Ade");
  const view = guest ? playerView(event, guest) : null;
  const joinQr = await qrSvg(joinUrl(originFrom(await headers()), DEMO_CODE));
  const station = snap.stations.find((s) => s.kind === "team") ?? snap.stations[0];
  const credits = snap.players.slice(0, 3);
  const moment = snap.feed.find((f) => f.kind === "scan");

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-nav">
        <div className="container site-nav__in">
          <Brand />
          <nav aria-label="Main" className="site-nav__links">
            <a href="#night">The night</a>
            <a href="#screens">Three screens</a>
            <a href="#questions">Questions</a>
          </nav>
          <Link className="btn btn--primary btn--sm" href="/console">
            Open the booth
          </Link>
        </div>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-h">
          <div className="container">
            <div className="hero__bill">
              <h1 id="hero-h" className="hero__title">
                Tonight, your event is the feature.
              </h1>
              <div className="hero__aside">
                <p className="hero__lead">Quests, QR stations, teams and a live screen, run from one booth.</p>
                <div className="row-actions">
                  <Link className="btn btn--primary" href="/console/new">
                    Set up an event
                  </Link>
                  <Link className="btn btn--ghost" href={`/board/${DEMO_CODE}`}>
                    Watch the demo
                  </Link>
                </div>
              </div>
            </div>
            <figure className="hero__screen">
              <NowShowing code={DEMO_CODE} initial={snap} />
              <figcaption className="caption">The Haunted Hall, playing now. Its players are simulated.</figcaption>
            </figure>
          </div>
        </section>

        <section className="section" id="night" aria-labelledby="night-h">
          <div className="container">
            <h2 id="night-h" className="section__h">Three reels, one night.</h2>
            <ol className="reels">
              <li className="reel">
                <span className="reel__n num" aria-hidden="true">1</span>
                <div className="reel__text">
                  <h3>Before the doors</h3>
                  <p>Describe the night. AI drafts a storyline and a route; you edit every station, then print admit-one tickets.</p>
                </div>
                <div className="reel__art" aria-hidden="true">
                  {station ? (
                    <div className="admit admit--mini">
                      <div className="admit__body">
                        <p className="admit__title">{station.title}</p>
                        <p>
                          <KindIcon kind={station.kind} size={14} /> {kindLabel[station.kind]}
                        </p>
                        <p className="admit__pts num">{station.points} points</p>
                      </div>
                      <div className="admit__stub">
                        <p className="admit__n num">{station.position}</p>
                        <div className="admit__qr" dangerouslySetInnerHTML={{ __html: joinQr }} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
              <li className="reel">
                <span className="reel__n num" aria-hidden="true">2</span>
                <div className="reel__text">
                  <h3>Showtime</h3>
                  <p>Players scan, answer and gather their crews. From the booth you announce, run the clock and pause play.</p>
                </div>
                <div className="reel__art" aria-hidden="true">
                  {moment ? (
                    <div className="jolt__card jolt__card--still">
                      <p className="jolt__fig num">+{moment.points}</p>
                      <p className="jolt__line">
                        {feedLine(moment).who} {feedLine(moment).what}
                      </p>
                    </div>
                  ) : null}
                </div>
              </li>
              <li className="reel">
                <span className="reel__n num" aria-hidden="true">3</span>
                <div className="reel__text">
                  <h3>End credits</h3>
                  <p>The screen names the top three and rolls the credits. Every result exports to a spreadsheet.</p>
                </div>
                <div className="reel__art" aria-hidden="true">
                  <ol className="credits-mini">
                    {credits.map((p) => (
                      <li key={p.id}>
                        <span>{p.team ?? "Solo"}</span>
                        <span>{p.name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section" id="screens" aria-labelledby="screens-h">
          <div className="container">
            <h2 id="screens-h" className="section__h">Three screens, one source of truth.</h2>
            <ThreeScreens snap={snap} view={view} />
          </div>
        </section>

        <section className="section" aria-labelledby="kinds-h">
          <div className="container">
            <h2 id="kinds-h" className="section__h">Three kinds of station.</h2>
            <ul className="kinds">
              {KINDS.map((k) => {
                const ex = snap.stations.find((s) => s.kind === k.kind);
                return (
                  <li key={k.kind} className="kinds__row">
                    <span className="kinds__icon" aria-hidden="true">
                      <KindIcon kind={k.kind} size={28} />
                    </span>
                    <h3 className="kinds__name">{k.name}</h3>
                    <p className="kinds__what">{k.what}</p>
                    {ex ? (
                      <p className="kinds__ex">
                        {ex.title}, <span className="num">{ex.points}</span> points
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="band" aria-labelledby="booth-h">
          <div className="container band__in">
            <h2 id="booth-h" className="band__h">Run the night from the booth.</h2>
            <dl className="controls">
              {CONTROLS.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="section" id="questions" aria-labelledby="faq-h">
          <div className="container faq">
            <div className="faq__side">
              <h2 id="faq-h" className="section__h">The box office.</h2>
            </div>
            <div className="faq__list">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="close" aria-labelledby="close-h">
          <div className="container close__in">
            <h2 id="close-h" className="close__h">The doors open when you go live.</h2>
            <div className="row-actions">
              <Link className="btn btn--primary btn--lg" href="/console/new">
                Set up an event
              </Link>
              <a className="btn btn--ghost btn--lg" href={REPO}>
                Read the code
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="container foot__in">
          <Brand />
          <nav aria-label="Footer" className="foot__links">
            <Link href="/console">The booth</Link>
            <Link href={`/play/${DEMO_CODE}`}>Demo ticket</Link>
            <Link href={`/board/${DEMO_CODE}`}>Demo screen</Link>
            <a href={REPO}>GitHub</a>
          </nav>
          <p className="foot__fine">Built with Kiro for Kiroween 2026. MIT licence.</p>
        </div>
      </footer>
    </>
  );
}
