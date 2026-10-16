"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useEffect, useId, type ComponentProps } from "react";
import { useNavigationFeedback } from "./navigation-feedback";

// Next handles modified clicks, external links, same-page anchors and history.
function PendingTracker() {
  const { pending } = useLinkStatus();
  const track = useNavigationFeedback();
  const id = useId();
  useEffect(() => {
    track(id, pending);
    return () => track(id, false);
  }, [id, pending, track]);
  return null;
}
export default function NavigationLink({ children, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props}>{children}<PendingTracker /></NextLink>;
}
