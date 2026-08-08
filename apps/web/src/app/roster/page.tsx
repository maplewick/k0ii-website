import { Suspense } from "react";

import { WarHub } from "@/components/war/war-hub";
import { fetchRoster } from "@/lib/api/client";

function Fallback() {
  return (
    <div className="pond-page">
      <div className="h-16 w-full max-w-xs animate-pulse rounded-[var(--radius-card)] bg-card-surface-alt" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-card-surface-alt" />
      <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-card-surface-alt" />
    </div>
  );
}

export default async function RosterPage() {
  let data = null;
  let error: string | null = null;

  try {
    data = await fetchRoster();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load roster";
  }

  return (
    <Suspense fallback={<Fallback />}>
      <WarHub data={data} error={error} />
    </Suspense>
  );
}
