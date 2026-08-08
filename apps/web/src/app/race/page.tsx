import { redirect } from "next/navigation";

export default function RaceRedirectPage() {
  redirect("/roster?view=race");
}
