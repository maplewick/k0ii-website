import { redirect } from "next/navigation";

export default function ReplayRedirectPage() {
  redirect("/history?view=replay");
}
