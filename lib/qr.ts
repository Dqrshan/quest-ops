import QRCode from "qrcode";

export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b0d14", light: "#ffffff" } });
}

export function stationUrl(origin: string, code: string, token: string) {
  return `${origin}/play/${code}?q=${encodeURIComponent(token)}`;
}

export function joinUrl(origin: string, code: string) {
  return `${origin}/play/${code}`;
}
