import { redirect } from "next/navigation";

export default function RegistryRedirectPage() {
  redirect("/community?view=registry");
}
