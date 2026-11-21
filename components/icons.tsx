type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
  "aria-hidden": true,
  focusable: false,
});

export const IconScan = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
    <path d="M7 12h10" />
  </svg>
);
export const IconKey = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="8" width="8" height="8" />
    <path d="M11 12h10M17 12v4M21 12v3" />
  </svg>
);
export const IconTeam = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="7" height="7" />
    <rect x="14" y="4" width="7" height="7" />
    <path d="M6.5 15v5M17.5 15v5M3 20h7M14 20h7" />
  </svg>
);
export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={3}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);
export const IconPlay = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M7 4l13 8-13 8z" fill="currentColor" />
  </svg>
);
export const IconPause = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M7 4v16M17 4v16" strokeWidth={3} />
  </svg>
);
export const IconStop = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="5" y="5" width="14" height="14" fill="currentColor" />
  </svg>
);
export const IconMegaphone = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M3 10v4h4l9 5V5L7 10zM19 9a4 4 0 0 1 0 6" />
  </svg>
);
export const IconClock = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l3 2M9 2h6" />
  </svg>
);
export const IconDownload = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3v12M6 10l6 6 6-6M4 21h16" />
  </svg>
);
export const IconPrint = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M7 9V3h10v6M7 17H3V9h18v8h-4M7 14h10v7H7z" />
  </svg>
);
export const IconScreen = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="2" y="4" width="20" height="13" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
export const IconPhone = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="6" y="2" width="12" height="20" />
    <path d="M10 18h4" />
  </svg>
);
export const IconClose = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);
export const IconShare = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3v13M7 8l5-5 5 5M5 12v9h14v-9" />
  </svg>
);
export const IconBolt = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconArrowUp = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.5}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);
export const IconArrowDown = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.5}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const IconExpand = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </svg>
);

export function KindIcon({ kind, size }: { kind: "scan" | "answer" | "team"; size?: number }) {
  return kind === "answer" ? <IconKey size={size} /> : kind === "team" ? <IconTeam size={size} /> : <IconScan size={size} />;
}

export const kindLabel = { scan: "Scan", answer: "Answer", team: "Team" } as const;
export const kindVerb = {
  scan: "Reach it and scan",
  answer: "Scan, then enter the codeword",
  team: "Your crew scans together",
} as const;
