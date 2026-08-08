"use client";

import type { RosterResponse } from "@k0ii/schemas";

import { RosterClient } from "@/components/roster/roster-client";
import { Heading } from "@/components/layout/heading";
import { Button } from "@/components/ui/button";

export function RosterView({
  data,
  error,
  embedded = false,
}: {
  data: RosterResponse | null;
  error: string | null;
  embedded?: boolean;
}) {
  if (error || !data) {
    return (
      <div className={embedded ? "pond-stack" : "pond-page"}>
        <div className="pond-card flex flex-col items-start gap-4 pond-pad">
          <Heading as={embedded ? "h2" : "h1"}>Could not load roster</Heading>
          <p className="max-w-md text-ink-soft">
            {error ?? "Unknown error."} Start the API, run migrations, and start the poll job
            (`bun run poll` in apps/api).
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return <RosterClient data={data} embedded={embedded} />;
}
