import { Suspense } from "react";

import { HistoryHub } from "@/components/history/history-hub";

function Fallback() {
  return <div className="pond-page pond-card pond-pad h-40 animate-pulse" />;
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <HistoryHub />
    </Suspense>
  );
}
