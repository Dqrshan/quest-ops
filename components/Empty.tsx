import { Ghost } from "./spooky";

/** An empty state: a ghost, because nobody is here yet, and a line that says what will appear and when. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="empty">
      <Ghost size={28} className="empty__ghost" />
      <span>{children}</span>
    </p>
  );
}
