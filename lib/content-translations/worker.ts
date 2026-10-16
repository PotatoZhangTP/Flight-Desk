import { retryDelaySeconds } from "./model";
import { protectTerms, TranslationFailure, type TranslationProvider } from "./provider";

export type TranslationJob = { id: string; lease_token: string; source_text: string; target_code: string; attempts: number };
export interface TranslationQueue {
  claim(): Promise<TranslationJob | null>;
  reserve(job: TranslationJob, characters: number): Promise<boolean>;
  finish(job: TranslationJob, text: string): Promise<boolean>;
  fail(job: TranslationJob, code: string, retryable: boolean, delay: number): Promise<void>;
}
export async function processTranslationJobs(queue: TranslationQueue, provider: TranslationProvider, options = { maxJobs: 3, timeBudgetMs: 35000 }) {
  const started = Date.now(); let processed = 0, completed = 0, obsolete = 0, failed = 0;
  while (processed < options.maxJobs && Date.now() - started < options.timeBudgetMs) {
    const job = await queue.claim(); if (!job) break;
    if (Date.now() - started >= options.timeBudgetMs) break; // Lease recovers; no new paid call beyond the deadline.
    processed++;
    let text: string, characters: number;
    try { characters = [...protectTerms(job.source_text).text].length; }
    catch { await queue.fail(job, "invalid_source", false, 30); failed++; continue; }
    if (!await queue.reserve(job, characters)) break;
    try { text = await provider.translate(job.source_text, job.target_code); }
    catch (error) {
      const failure = error instanceof TranslationFailure ? error : new TranslationFailure("unexpected_provider_error", true);
      await queue.fail(job, failure.code, failure.retryable, retryDelaySeconds(job.attempts)); failed++;
      if (["provider_401", "provider_403", "provider_456"].includes(failure.code)) break;
      continue;
    }
    // If the DB response is lost, do not call the provider again here. Lease recovery
    // and the generation fence decide whether a future attempt is still needed.
    if (await queue.finish(job, text)) completed++; else obsolete++;
  }
  return { processed, completed, obsolete, failed };
}
