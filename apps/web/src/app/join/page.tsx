import { redirect } from "next/navigation";

export default function JoinRedirectPage() {
  redirect("/community?view=join");
}
