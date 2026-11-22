"use client";
import { Ago } from "./Ago";
import { Empty } from "./Empty";
import { feedLine } from "@/lib/feed";
import type { Snapshot } from "@/lib/game";

export { feedLine };

export function TeamTable({ snap, changed, limit, caption = "Team standings" }: { snap: Snapshot; changed: Set<string>; limit?: number; caption?: string }) {
  const rows = snap.teams.slice(0, limit);
  if (!rows.length) return <Empty>No teams yet. A team appears the moment its first player joins.</Empty>;
  return (
    <table className="billing">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="billing__rank">Place</th>
          <th scope="col">Team</th>
          <th scope="col" className="billing__aux">Crew</th>
          <th scope="col" className="billing__pts">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr key={t.id} className={changed.has(`t${t.id}`) ? "is-updated" : undefined}>
            <td className="billing__rank num">{i + 1}</td>
            <th scope="row" className="billing__name">{t.name}</th>
            <td className="billing__aux num">{t.members}</td>
            <td className="billing__pts num">{t.score}</td>
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
    <table className="billing billing--small">
      <caption className="visually-hidden">Player standings</caption>
      <thead>
        <tr>
          <th scope="col" className="billing__rank">Place</th>
          <th scope="col">Player</th>
          <th scope="col" className="billing__pts">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p, i) => (
          <tr key={p.id} className={changed.has(`p${p.id}`) ? "is-updated" : undefined}>
            <td className="billing__rank num">{i + 1}</td>
            <th scope="row" className="billing__name">
              {p.name}
              {p.team ? <span className="billing__team">{p.team}</span> : null}
            </th>
            <td className="billing__pts num">{p.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Feed({ snap, limit = 12 }: { snap: Snapshot; limit?: number }) {
  const items = snap.feed.slice(0, limit);
  if (!items.length) return <Empty>Scans appear here as they happen.</Empty>;
  return (
    <ul className="feed">
      {items.map((f) => {
        const l = feedLine(f);
        return (
          <li key={f.id} className={`feed__item feed__item--${f.kind}${f.first ? " feed__item--first" : ""}`}>
            <span className="feed__what">
              <strong>{l.who}</strong> {l.what}
            </span>
            <span className="feed__pts num">
              {f.points > 0 ? "+" : ""}
              {f.points}
            </span>
            <Ago at={f.at} />
          </li>
        );
      })}
    </ul>
  );
}
