import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayClient } from "@/components/play/PlayClient";
import { getEventByCode } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const e = getEventByCode((await params).code);
  return { title: e ? `${e.name}: play` : "Event not found", robots: { index: false } };
}

export default async function PlayPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ q?: string }> }) {
  const { code } = await params;
  const { q } = await searchParams;
  if (!getEventByCode(code)) notFound();
  return <PlayClient code={code.toUpperCase()} initialToken={typeof q === "string" ? q.slice(0, 64) : undefined} />;
}
