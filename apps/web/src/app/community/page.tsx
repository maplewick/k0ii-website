import { Suspense } from "react";

import { CommunityHub } from "@/components/community/community-hub";
import { HubSkeleton } from "@/components/hub/view-switcher";

function Fallback() {
  return (
    <div className="pond-page">
      <HubSkeleton className="h-36" />
      <HubSkeleton className="h-56" />
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CommunityHub />
    </Suspense>
  );
}
