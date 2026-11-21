import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BoardScreen } from "@/components/BoardScreen";
import { getEventByCode, snapshot } from "@/lib/game";
import { originFrom } from "@/lib/http";
import { joinUrl, qrSvg } from "@/lib/qr";
import { DEMO_CODE, ensureDemo } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const e = getEventByCode((await params).code);
  return { title: e ? `${e.name}: venue screen` : "Event not found", robots: { index: false } };
}

export default async function BoardPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  if (code === DEMO_CODE) ensureDemo();
  const event = getEventByCode(code);
  if (!event) notFound();
  const url = joinUrl(originFrom(await headers()), event.code);
  return <BoardScreen code={event.code} initial={snapshot(event)} joinQr={await qrSvg(url)} joinUrl={url} simulated={event.code === DEMO_CODE} />;
}
