import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="container" style={{ paddingBlock: "var(--space-3xl)" }}>
      <div className="stack stack--lg">
        <Brand />
        <h1>No station here.</h1>
        <p className="lead">That page or event code does not exist. Check the code on the poster, or head back.</p>
        <div className="row-actions">
          <Link className="btn btn--primary" href="/">Back to QuestOps</Link>
        </div>
      </div>
    </main>
  );
}
