import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/console/Forms";
import { organizerState } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Console", template: "%s: QuestOps console" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const state = await organizerState();
  return (
    <div className="console">
      <header className="console__bar">
        <div className="console__inner">
          <Brand href="/console" />
          <nav aria-label="Console" className="console__nav">
            <Link href="/console">Events</Link>
            <Link href="/">Site</Link>
            {state === "authed" ? <LogoutButton /> : null}
          </nav>
        </div>
      </header>
      <div className="console__inner console__main">{children}</div>
    </div>
  );
}
