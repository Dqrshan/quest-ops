import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="QuestOps home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
        <rect x="1" y="1" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M5 19h6v-6h5V7h5" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="16" y="2" width="8" height="8" className="brand__stop" />
      </svg>
      <span>QuestOps</span>
    </Link>
  );
}
