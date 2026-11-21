import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="container lost">
      <Brand />
      <h1>This reel is missing.</h1>
      <p className="hero__lead">That page or event code does not exist. Check the code on the poster; codes are six characters.</p>
      <div className="row-actions">
        <Link className="btn btn--primary" href="/">
          Back to QuestOps
        </Link>
        <Link className="btn btn--ghost" href="/play/HAUNTS">
          Try the demo ticket
        </Link>
      </div>
    </main>
  );
}
