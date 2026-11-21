import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BoardScreen } from "@/components/BoardScreen";
import { getEventByCode, snapshot } from "@/lib/game";
import { qrSvg, joinUrl } from "@/lib/qr";
import { originFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const e = getEventByCode((await params).code);
  return { title: e ? `${e.name}: live board` : "Event not found", robots: { index: false } };
}

export default async function BoardPage({ params }: { params: Promise<{ code: string }> }) {
  const event = getEventByCode((await params).code);
  if (!event) notFound();
  const h = await headers();
  const o = originFrom(h);
  const url = joinUrl(o, event.code);
  return (
    <div data-colourway="night" className="night">
      <BoardScreen code={event.code} initial={snapshot(event)} joinQr={await qrSvg(url)} joinUrl={url} />
    </div>
  );
}
