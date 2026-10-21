import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import {
  MemorialFlightDetail,
  type MemorialFlightDetailEvent,
} from "@/components/memorial-flight-detail";
import { requestAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

function isPublished(event: Record<string, unknown>, today: Date) {
  const start = event.publish_start_date
    ? new Date(`${event.publish_start_date}T00:00:00Z`)
    : new Date(
        Date.UTC(
          Number(event.publish_year),
          Number(event.publish_month) - 1,
          Number(event.publish_day),
        ),
      );
  const end = event.publish_end_date
    ? new Date(`${event.publish_end_date}T23:59:59Z`)
    : start;
  if (!event.recurring) return today >= start && today <= end;
  const year = today.getUTCFullYear();
  const startThisYear = new Date(
    Date.UTC(year, start.getUTCMonth(), start.getUTCDate()),
  );
  const endThisYear = new Date(
    Date.UTC(year, end.getUTCMonth(), end.getUTCDate(), 23, 59, 59),
  );
  return startThisYear <= endThisYear
    ? today >= startThisYear && today <= endThisYear
    : today >= startThisYear || today <= endThisYear;
}

export default async function MemorialFlightPage({
  params,
}: {
  params: Promise<{ eventKey: string }>;
}) {
  const { supabase, user } = await requestAuth();
  if (!user)
    redirect(
      `/auth?next=/memorial-flights/${encodeURIComponent((await params).eventKey)}`,
    );
  const { eventKey } = await params;
  const { data: event } = await supabase
    .from("memorial_events")
    .select("*")
    .eq("event_key", eventKey)
    .eq("enabled", true)
    .maybeSingle();
  if (
    !event ||
    !isPublished(
      event,
      new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`),
    )
  )
    notFound();
  return (
    <div className="min-h-screen bg-page">
      <SiteHeader />
      <MemorialFlightDetail
        event={event as MemorialFlightDetailEvent}
      />
    </div>
  );
}
