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

function occurrenceDate(event: Record<string, unknown>, today: Date) {
  const month = String(event.event_month).padStart(2, "0");
  const day = String(event.event_day).padStart(2, "0");
  return event.recurring
    ? `${today.getUTCFullYear()}-${month}-${day}`
    : String(event.event_date || `${event.event_year}-${month}-${day}`);
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
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  if (!event || !isPublished(event, today))
    notFound();
  const { data: publishedEvents } = await supabase
    .from("memorial_events")
    .select("*")
    .eq("enabled", true);
  const currentOccurrence = occurrenceDate(event, today);
  const events = (publishedEvents ?? [])
    .filter(candidate => isPublished(candidate, today) && occurrenceDate(candidate, today) === currentOccurrence)
    .sort((left, right) => String(left.event_key || left.id).localeCompare(String(right.event_key || right.id)));
  return (
    <div className="min-h-screen bg-page">
      <SiteHeader />
      <MemorialFlightDetail
        event={event as MemorialFlightDetailEvent}
        events={events as MemorialFlightDetailEvent[]}
        currentEventKey={eventKey}
      />
    </div>
  );
}
