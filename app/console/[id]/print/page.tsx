import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { PrintButton } from "@/components/console/Forms";
import { getEventById, listQuests } from "@/lib/game";
import { originFrom } from "@/lib/http";
import { joinUrl, qrSvg, stationUrl } from "@/lib/qr";
import { requireOrganizer } from "../../gate";

export const metadata = { title: "Print stations" };

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
          <h1 className="console__h1">Station sheets</h1>
          <p>
            One card per station, plus a join poster. {hasAnswers ? (showAnswers ? "Codewords are shown on the cards." : "Codewords are hidden from the cards.") : null}
          </p>
        </div>
        <div className="row-actions">
          {hasAnswers ? (
            <Link className="btn btn--ghost" href={`/console/${event.id}/print${showAnswers ? "" : "?answers=1"}`}>
              {showAnswers ? "Hide codewords" : "Show codewords on cards"}
            </Link>
          ) : null}
          <PrintButton />
        </div>
      </div>
      <div className="sheets">
        <article className="sheet sheet--join">
          <h2>Join {event.name}</h2>
          <div className="sheet__qr" dangerouslySetInnerHTML={{ __html: join }} role="img" aria-label="QR code to join the event" />
          <p className="sheet__code num">{event.code}</p>
          <p>Scan with your phone camera. No account needed.</p>
        </article>
        {cards.map(({ q, svg }) => (
          <article key={q.id} className="sheet">
            <p className="sheet__n num">{q.position}</p>
            <h2>{q.title}</h2>
            <div className="sheet__qr" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={`QR code for station ${q.position}`} />
            <p className="sheet__pts num">{q.points} points</p>
            {q.kind === "answer" && showAnswers ? <p className="sheet__word">Codeword: <strong>{q.answer}</strong></p> : null}
            {q.kind === "team" ? <p>Team station: {q.team_size} teammates must scan.</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
