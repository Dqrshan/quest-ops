import { SetupFlow } from "@/components/console/SetupFlow";
import { requireOrganizer } from "../gate";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireOrganizer();
  return (
    <div className="stack stack--xl">
      <h1 className="console__h1">Set up a new event</h1>
      <SetupFlow />
    </div>
  );
}
