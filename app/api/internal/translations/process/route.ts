import { NextResponse } from "next/server";
import { validWorkerAuthorization, workerServices } from "@/lib/content-translations/worker-server";
import { processTranslationJobs } from "@/lib/content-translations/worker";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!validWorkerAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const services = workerServices();
  if (!services) return NextResponse.json({ error: "Translation worker is not configured or enabled." }, { status: 503 });
  try { return NextResponse.json(await processTranslationJobs(services.queue, services.provider), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Translation queue unavailable. Pending jobs are retained." }, { status: 503 }); }
}
export const POST = GET;
