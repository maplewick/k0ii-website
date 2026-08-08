import { redirect } from "next/navigation";

export default function AltPointsRedirectPage() {
  redirect("/roster?view=members");
}
