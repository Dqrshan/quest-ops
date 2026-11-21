import { GameError } from "./game";

export async function idParam(params: Promise<Record<string, string>>, key = "id"): Promise<number> {
  const v = Number((await params)[key]);
  if (!Number.isInteger(v) || v <= 0) throw new GameError("Bad id.", 400);
  return v;
}
