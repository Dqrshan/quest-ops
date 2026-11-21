type P = { size?: number; title?: string };

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
    <path d="M8 12h8" />
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

export const IconPrint = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M7 9V3h10v6M7 17H3V9h18v8h-4M7 14h10v7H7z" />
  </svg>
);

export function KindIcon({ kind, size }: { kind: "scan" | "answer" | "team"; size?: number }) {
  return kind === "answer" ? <IconKey size={size} /> : kind === "team" ? <IconTeam size={size} /> : <IconScan size={size} />;
}

export const kindLabel = { scan: "Scan", answer: "Answer", team: "Team" } as const;
