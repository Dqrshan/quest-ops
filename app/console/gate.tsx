import { redirect } from "next/navigation";
import { organizerState } from "@/lib/auth";

/** Call at the top of every console page. Sends the visitor to sign in, or explains a misconfigured server. */
export async function requireOrganizer(): Promise<void> {
  const s = await organizerState();
  if (s === "locked") redirect("/console/login");
  if (s === "unconfigured") {
    throw new Error("CONSOLE_PASSCODE is not set. The console is disabled in production until it is.");
  }
}
