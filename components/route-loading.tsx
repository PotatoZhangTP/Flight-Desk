"use client";

import { PageLoadingScreen } from "./page-loading-screen";
import { useNavigationPending } from "./navigation-feedback";
import type { LoadingContext } from "@/lib/ui-messages";

export function RouteLoading({ context = "page" }: { context?: LoadingContext }) {
  const navigationPending = useNavigationPending();
  // Cold loads have no previous page to blur. Do not manufacture screenshots or
  // stack a second overlay while the root navigation overlay is already visible.
  return <div className="min-h-screen bg-page">{!navigationPending && <PageLoadingScreen context={context} />}</div>;
}
