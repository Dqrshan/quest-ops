import { cookies } from "next/headers";
import { GameError, getEventByCode, getPlayerByToken, type EventRow, type PlayerRow } from "./game";

export const playerCookie = (code: string) => `qo_p_${code.toUpperCase()}`;

export async function sessionFor(code: string): Promise<{ event: EventRow; player: PlayerRow | undefined }> {
  const event = getEventByCode(code);
  if (!event) throw new GameError("No event with that code.", 404);
  const jar = await cookies();
  return { event, player: getPlayerByToken(event.id, jar.get(playerCookie(event.code))?.value) };
}
