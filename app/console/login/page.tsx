import { redirect } from "next/navigation";
import { LoginForm } from "@/components/console/Forms";
import { organizerState } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const s = await organizerState();
  if (s === "open" || s === "authed") redirect("/console");
  return (
    <div className="narrow stack stack--lg">
      <h1 className="console__h1">Organizer sign-in</h1>
      {s === "unconfigured" ? (
        <p className="alert" role="alert">
          CONSOLE_PASSCODE is not set on this server. Set it and restart to turn the console on.
        </p>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
