import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createDeepLProvider } from "./provider";
import type { TranslationJob, TranslationQueue } from "./worker";

export function validWorkerAuthorization(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header || header.length > 1024) return false;
  const expected = Buffer.from(`Bearer ${secret}`), supplied = Buffer.from(header);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
export function workerServices() {
  if (process.env.CONTENT_TRANSLATIONS_ENABLED !== "true" || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.DEEPL_AUTH_KEY || !["free", "pro"].includes(process.env.DEEPL_API_PLAN ?? "")) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  async function rpc(name: string, args: Record<string, unknown>) { const result = await supabase.rpc(name, args).abortSignal(AbortSignal.timeout(5000)); if (result.error) throw new Error("translation_queue_unavailable"); return result.data; }
  const queue: TranslationQueue = {
    async claim() {
      // Each RPC releases source locks before touching another entity. This avoids
      // lock-order inversions against a multi-item backfill transaction.
      for (let skipped = 0; skipped < 3; skipped++) {
        const rows = await rpc("claim_content_translation_job", {}), job = rows?.[0] as TranslationJob | undefined;
        if (!job) return null;
        if (job.lease_token) return job;
      }
      return null;
    },
    async reserve(job, characters) { return await rpc("reserve_content_translation_call", { p_job_id: job.id, p_lease_token: job.lease_token, p_characters: characters }) === true; },
    async finish(job, text) { return await rpc("finish_content_translation_job", { p_job_id: job.id, p_lease_token: job.lease_token, p_text: text }) === true; },
    async fail(job, code, retryable, delay) { await rpc("fail_content_translation_job", { p_job_id: job.id, p_lease_token: job.lease_token, p_error_code: code, p_retryable: retryable, p_delay_seconds: delay }); },
  };
  return { queue, provider: createDeepLProvider({ key: process.env.DEEPL_AUTH_KEY, plan: process.env.DEEPL_API_PLAN as "free" | "pro", glossaryId: process.env.DEEPL_GLOSSARY_ID }) };
}
