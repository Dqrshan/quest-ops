/**
 * The Kiroween set. One grammar for every glyph so they read as a family:
 * a 24-unit grid, a 2-unit stroke, square caps and mitred joins (the same as components/icons.tsx),
 * outlines in currentColor, and one accent part per glyph (eyes, flame, band, bubbles)
 * drawn in --spooky-accent. They are decorative: hidden from assistive tech unless given a title.
 */
type P = { size?: number; className?: string; title?: string };

function Svg({ size = 24, className = "", title, children, viewBox = "0 0 24 24" }: P & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={`spooky ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Accent parts take the second print colour. */
const A = "spooky__a";

export const Ghost = (p: P) => (
  <Svg {...p}>
    <path d="M5 21V10a7 7 0 0 1 14 0v11l-2.33-2-2.34 2L12 19l-2.33 2-2.34-2z" />
    <rect className={A} x="8.5" y="9" width="2" height="3" fill="currentColor" stroke="none" />
    <rect className={A} x="13.5" y="9" width="2" height="3" fill="currentColor" stroke="none" />
  </Svg>
);

export const Spider = (p: P) => (
  <Svg {...p}>
    <path d="M12 1v6.5" strokeWidth={1.25} />
    <circle cx="12" cy="9.5" r="2" />
    <ellipse cx="12" cy="15" rx="3.25" ry="3.75" />
    <path d="M10.2 9.2L7.5 6.5 5 7.5M9.2 13L5 11l-2.5 1.5M9 15.5l-4 .5-2 3M9.8 17.8l-2.3 2.7V23" />
    <path d="M13.8 9.2l2.7-2.7 2.5 1M14.8 13l4.2-2 2.5 1.5M15 15.5l4 .5 2 3M14.2 17.8l2.3 2.7V23" />
    <rect className={A} x="10.6" y="8.6" width="1.2" height="1.6" fill="currentColor" stroke="none" />
    <rect className={A} x="12.2" y="8.6" width="1.2" height="1.6" fill="currentColor" stroke="none" />
  </Svg>
);

export const WitchHat = (p: P) => (
  <Svg {...p}>
    <path d="M2 19.5Q12 23 22 19.5" />
    <path d="M6 19L10.5 6.5 16 2.5 14.2 7.5 18 19" />
    <path className={A} d="M7 15.5h3.25M13.75 15.5H17" />
    <rect className={A} x="10.75" y="13.75" width="2.5" height="3.5" />
  </Svg>
);

export const Bat = (p: P) => (
  <Svg {...p}>
    <path d="M12 17l-1.5-2c-1-1.5-2.5-1.8-4-.5-.7-1.7-2.5-2.3-4-1.5.1-2.5-.7-4.5-1.5-6 3-.2 6 .6 8.5 2.5L10 6l1.3 1.6h1.4L14 6l.5 3.5c2.5-1.9 5.5-2.7 8.5-2.5-.8 1.5-1.6 3.5-1.5 6-1.5-.8-3.3-.2-4 1.5-1.5-1.3-3-1-4 .5z" />
    <rect className={A} x="10.6" y="10" width="1" height="1.4" fill="currentColor" stroke="none" />
    <rect className={A} x="12.4" y="10" width="1" height="1.4" fill="currentColor" stroke="none" />
  </Svg>
);

export const Pumpkin = (p: P) => (
  <Svg {...p}>
    <path d="M12 7.5c-6-.5-9 2.5-9 7s3.5 6.5 9 6.5 9-2 9-6.5-3-7.5-9-7z" />
    <path d="M12 7.5V4.5l2.5-2" />
    <path className={A} d="M7.5 13l1.5-2.25L10.5 13zM13.5 13l1.5-2.25L16.5 13z" fill="currentColor" strokeWidth={1} />
    <path className={A} d="M7.5 16l1.75 1.5L11 16l1 1.5 1-1.5 1.75 1.5L16.5 16" strokeWidth={1.5} />
  </Svg>
);

export const Skull = (p: P) => (
  <Svg {...p}>
    <path d="M12 3c-5 0-8 3.5-8 7.5 0 2.5 1.2 4.3 3 5.3V20h10v-4.2c1.8-1 3-2.8 3-5.3C20 6.5 17 3 12 3z" />
    <path d="M10 20v-2.5M12 20v-2.5M14 20v-2.5" strokeWidth={1.5} />
    <circle className={A} cx="9" cy="11" r="1.75" fill="currentColor" stroke="none" />
    <circle className={A} cx="15" cy="11" r="1.75" fill="currentColor" stroke="none" />
    <path className={A} d="M12 13.5l-1 2h2z" fill="currentColor" strokeWidth={1} />
  </Svg>
);

export const Moon = (p: P) => (
  <Svg {...p}>
    <path d="M19.5 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10 10.5z" />
    <path className={A} d="M18 1.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" stroke="none" />
    <path className={A} d="M21.5 8l.45 1.05 1.05.45-1.05.45-.45 1.05-.45-1.05L20 9.5l1.05-.45z" fill="currentColor" stroke="none" />
  </Svg>
);

export const Candle = (p: P) => (
  <Svg {...p}>
    <path d="M9 21V10h6v11M6 21h12" />
    <path d="M11 10v3.5" />
    <path d="M12 8.5V10" />
    <path className={A} d="M12 2.5c2 2.5 2.5 4 0 6-2.5-2-2-3.5 0-6z" fill="currentColor" strokeWidth={1} />
  </Svg>
);

export const Cauldron = (p: P) => (
  <Svg {...p}>
    <path d="M3 10.5h18" />
    <path d="M5 10.5c-1 5 1 9 4 9.5h6c3-.5 5-4.5 4-9.5" />
    <path d="M7.5 20L6.5 22.5M16.5 20l1 2.5" />
    <circle className={A} cx="10" cy="6.5" r="1.5" strokeWidth={1.5} />
    <circle className={A} cx="14.5" cy="4.5" r="1" strokeWidth={1.5} />
    <circle className={A} cx="13.25" cy="8" r="0.75" fill="currentColor" stroke="none" />
  </Svg>
);

export const Tombstone = (p: P) => (
  <Svg {...p}>
    <path d="M6 21V9a6 6 0 0 1 12 0v12M3 21h18" />
    <path className={A} d="M12 8.5v7M9.5 11h5" />
  </Svg>
);

/** A corner web on a 48 grid. Rotate with the `corner` prop; hairline so it sits behind content. */
export function Cobweb({ size = 72, corner = "tl", className = "" }: { size?: number; corner?: "tl" | "tr" | "bl" | "br"; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="square"
      className={`spooky cobweb cobweb--${corner} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0L46 0M0 0L42.5 17.6M0 0L32.5 32.5M0 0L17.6 42.5M0 0L0 46" />
      <path d="M11 0Q8.6 1.7 10.2 4.2Q7.3 4.9 7.8 7.8Q4.9 7.3 4.2 10.2Q1.7 8.6 0 11M20 0Q15.7 3.1 18.5 7.7Q13.3 8.9 14.1 14.1Q8.9 13.3 7.7 18.5Q3.1 15.7 0 20M29 0Q22.8 4.5 26.8 11.1Q19.3 12.9 20.5 20.5Q12.9 19.3 11.1 26.8Q4.5 22.8 0 29M38 0Q29.8 5.9 35.1 14.5Q25.3 16.9 26.9 26.9Q16.9 25.3 14.5 35.1Q5.9 29.8 0 38" />
    </svg>
  );
}

/** A spider on its thread, hung from the top of its container. */
export function HangingSpider({ drop = 64, size = 36, className = "" }: { drop?: number; size?: number; className?: string }) {
  return (
    <span className={`hang ${className}`} style={{ ["--hang-drop" as string]: `${drop}px` }} aria-hidden="true">
      <span className="hang__thread" />
      <Spider size={size} className="hang__spider" />
    </span>
  );
}

export const CAST = [
  ["Ghost", Ghost],
  ["Spider", Spider],
  ["Witch hat", WitchHat],
  ["Bat", Bat],
  ["Pumpkin", Pumpkin],
  ["Skull", Skull],
  ["Moon", Moon],
  ["Candle", Candle],
  ["Cauldron", Cauldron],
  ["Tombstone", Tombstone],
] as const;
