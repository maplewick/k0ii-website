import { HomePage } from "@/components/home/home-page";
import { fetchRoster } from "@/lib/api/client";

export default async function Page() {
  let data = null;
  let error: string | null = null;

  try {
    data = await fetchRoster();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load roster";
  }

  return <HomePage data={data} error={error} />;
}
