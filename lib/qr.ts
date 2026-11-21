import QRCode from "qrcode";

/** QR codes stay black on white: phone cameras read that most reliably in a dark room. */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
}

export function stationUrl(origin: string, code: string, token: string) {
  return `${origin}/play/${code}?q=${encodeURIComponent(token)}`;
}

export function joinUrl(origin: string, code: string) {
  return `${origin}/play/${code}`;
}
