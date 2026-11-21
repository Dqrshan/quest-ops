"use client";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => Detector;
  }
}

export function tokenFrom(value: string): string {
  const v = value.trim();
  try {
    const q = new URL(v).searchParams.get("q");
    if (q) return q;
  } catch {}
  return v;
}

export function Scanner({ onToken, active }: { onToken: (token: string) => void; active: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "starting" | "on" | "denied" | "unsupported">("idle");
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!active) return;
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    let stream: MediaStream | undefined;
    let raf = 0;
    let stopped = false;
    let last = 0;
    setState("starting");
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = video.current!;
        v.srcObject = s;
        await v.play().catch(() => {});
        setState("on");
        const loop = async (t: number) => {
          if (stopped) return;
          if (t - last > 200 && v.readyState >= 2) {
            last = t;
            try {
              const found = await detector.detect(v);
              const hit = found.find((f) => f.rawValue);
              if (hit) {
                stopped = true;
                onToken(tokenFrom(hit.rawValue));
                return;
              }
            } catch {}
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => setState("denied"));
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, onToken]);

  return (
    <div className="scanner">
      {state === "on" || state === "starting" ? (
        <div className="scanner__view">
          <video ref={video} muted playsInline aria-label="Camera view" />
          <span className="scanner__frame" aria-hidden="true" />
        </div>
      ) : null}
      {state === "denied" ? <p className="note">Camera access is blocked. Use your phone&apos;s own camera on the station QR, or type the code below.</p> : null}
      {state === "unsupported" ? (
        <p className="note">This browser cannot scan inside the page. Point your phone&apos;s camera at the station QR and tap the link, or type the code below.</p>
      ) : null}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onToken(tokenFrom(manual));
        }}
      >
        <label className="field">
          <span className="field__label">Station code</span>
          <input value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="Paste the code or link" />
        </label>
        <button className="btn btn--ghost" type="submit" disabled={!manual.trim()}>
          Use this code
        </button>
      </form>
    </div>
  );
}
