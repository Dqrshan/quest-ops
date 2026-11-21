import Link from "next/link";

/** The wordmark: a film frame with a stitch through it, then the name in the poster face. */
export function Brand({ href = "/", label = "QuestOps home" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="brand" aria-label={label}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
        <rect x="1" y="1" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M1 7h4M1 14h4M1 21h4M23 7h4M23 14h4M23 21h4" stroke="currentColor" strokeWidth="2" />
        <path className="brand__stitch" d="M8 14h12M10 11v6M14 11v6M18 11v6" strokeWidth="2" />
      </svg>
      <span>QuestOps</span>
    </Link>
  );
}
