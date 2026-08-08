import { redirect } from "next/navigation";

export default function LeaderboardsRedirectPage() {
  redirect("/roster?view=clans");
}
