"use client";
import Link from "next/link";
import { Ago } from "./Ago";
import { useSnapshot } from "./useSnapshot";
import type { Snapshot } from "@/lib/game";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function TeamTable({ snap, changed, limit }: { snap: Snapshot; changed: Set<string>; limit?: number }) {
  const rows = snap.teams.slice(0, limit);
  if (!rows.length) return <Empty>No teams yet. The first team shows up here the moment someone joins one.</Empty>;
  return (
    <table className="board">
      <caption className="visually-hidden">Team standings</caption>
      <thead>
        <tr>
          <th scope="col" className="board__rank">Place</th>
          <th scope="col">Team</th>
          <th scope="col" className="board__hide">Crew</th>
          <th scope="col" className="board__num">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr key={t.id} className={changed.has(`t${t.id}`) ? "is-updated" : undefined}>
            <td className="board__rank num">{i + 1}</td>
            <th scope="row">{t.name}</th>
            <td className="board__hide num">{t.members}</td>
            <td className="board__num num">{t.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PlayerTable({ snap, changed, limit }: { snap: Snapshot; changed: Set<string>; limit?: number }) {
  const rows = snap.players.slice(0, limit);
  if (!rows.length) return <Empty>Nobody has joined yet.</Empty>;
  return (
    <table className="board board--small">
      <caption className="visually-hidden">Individual standings</caption>
      <thead>
        <tr>
          <th scope="col" className="board__rank">Place</th>
          <th scope="col">Player</th>
          <th scope="col" className="board__num">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p, i) => (
          <tr key={p.id} className={changed.has(`p${p.id}`) ? "is-updated" : undefined}>
            <td className="board__rank num">{i + 1}</td>
            <th scope="row">
              {p.name}
              {p.team ? <span className="board__team"> {p.team}</span> : null}
            </th>
            <td className="board__num num">{p.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Feed({ snap }: { snap: Snapshot }) {
  if (!snap.feed.length) return <Empty>Scans appear here as they happen.</Empty>;
  return (
    <ul className="feed">
      {snap.feed.map((f) => (
        <li key={f.id}>
          <span className="feed__what">
            {f.bonus ? (
              <>
                <strong>{f.team}</strong> unlocked the team bonus at {f.quest}
              </>
            ) : (
              <>
                <strong>{f.player}</strong> reached {f.quest}
              </>
            )}
          </span>
          <span className="feed__pts num">+{f.points}</span>
          <Ago at={f.at} />
        </li>
      ))}
    </ul>
  );
}

/** Compact live board for the landing page. */
export function LiveBoardBand({ code, initial }: { code: string; initial: Snapshot }) {
  const { snap, changed, connected } = useSnapshot(code, initial);
  return (
    <div className="band-board">
      <div className="band-board__head">
        <h3>{snap.event.name}</h3>
        <span className={`live ${connected ? "live--on" : ""}`}>{connected ? "Live" : "Connecting"}</span>
      </div>
      <TeamTable snap={snap} changed={changed} />
      <p className="band-board__foot">
        <Link href={`/board/${code}`}>Open the full venue screen</Link>
      </p>
    </div>
  );
}
