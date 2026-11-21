import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/console/Forms";
import { kindVerb } from "@/components/icons";
import { getEventById, listQuests } from "@/lib/game";
import { originFrom } from "@/lib/http";
import { joinUrl, qrSvg, stationUrl } from "@/lib/qr";
import { requireOrganizer } from "../../gate";

export const metadata = { title: "Print tickets" };

export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ answers?: string }> }) {
  await requireOrganizer();
  const event = getEventById(Number((await params).id));
  if (!event) notFound();
  const showAnswers = (await searchParams).answers === "1";
  const o = originFrom(await headers());
  const quests = listQuests(event.id);
  const join = await qrSvg(joinUrl(o, event.code));
  const cards = await Promise.all(quests.map(async (q) => ({ q, svg: await qrSvg(stationUrl(o, event.code, q.token)) })));
  const hasAnswers = quests.some((q) => q.kind === "answer");
  return (
    <div className="stack stack--lg">
      <div className="noprint between">
        <div className="stack">
          <h1 className="console__h1">Admit-one tickets</h1>
          <p className="muted">
            One ticket per station, plus a join poster. Cut along the dashes and stick each at its station.
            {hasAnswers ? (showAnswers ? " Codewords are printed on the cards." : " Codewords are hidden; print them on the station signs.") : ""}
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn btn--ghost" href={`/console/${event.id}`}>
            Back to the booth
          </Link>
          {hasAnswers ? (
            <Link className="btn btn--ghost" href={`/console/${event.id}/print${showAnswers ? "" : "?answers=1"}`}>
              {showAnswers ? "Hide codewords" : "Show codewords"}
            </Link>
          ) : null}
          <PrintButton />
        </div>
      </div>
      <div className="tickets">
        <article className="admit admit--join">
          <div className="admit__body">
            <h2 className="admit__title">Join {event.name}</h2>
            <p>Scan with your phone camera to join. No account, no app.</p>
            <p className="admit__code num">{event.code}</p>
          </div>
          <div className="admit__stub">
            <p className="admit__n">Join</p>
            <div className="admit__qr" dangerouslySetInnerHTML={{ __html: join }} role="img" aria-label="QR code to join the event" />
          </div>
        </article>
        {cards.map(({ q, svg }) => (
          <article key={q.id} className="admit">
            <div className="admit__body">
              <h2 className="admit__title">{q.title}</h2>
              <p>{kindVerb[q.kind]}{q.kind === "team" ? `: ${q.team_size} teammates` : ""}.</p>
              {q.kind === "answer" && showAnswers ? (
                <p className="admit__word">
                  Codeword <strong>{q.answer}</strong>
                </p>
              ) : null}
              <p className="admit__pts num">{q.points} points</p>
            </div>
            <div className="admit__stub">
              <p className="admit__n num" aria-label={`Station ${q.position}`}>{q.position}</p>
              <div className="admit__qr" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={`QR code for station ${q.position}, ${q.title}`} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
