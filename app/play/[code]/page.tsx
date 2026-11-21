import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayClient } from "@/components/play/PlayClient";
import { getEventByCode, personalFrame } from "@/lib/game";
import { sessionFor } from "@/lib/player-session";
import { DEMO_CODE, ensureDemo } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const e = getEventByCode((await params).code);
  return { title: e ? `${e.name}: your ticket` : "Event not found", robots: { index: false } };
}

export default async function PlayPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ q?: string }> }) {
  const { code } = await params;
  const { q } = await searchParams;
  if (code.toUpperCase() === DEMO_CODE) ensureDemo();
  if (!getEventByCode(code)) notFound();
  const { event, player } = await sessionFor(code);
  return <PlayClient code={event.code} initial={personalFrame(event, player)} initialToken={typeof q === "string" ? q.slice(0, 64) : undefined} />;
}
