"use client";

import { useRef, useState } from "react";
import { unstable_rethrow } from "next/navigation";

/** Synchronous lock also blocks two submits before React has painted disabled. */
export function useAsyncOperation() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run(task: () => Promise<void>, onError: () => void) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try { await task(); }
    catch (error) { unstable_rethrow(error); onError(); }
    finally { locked.current = false; setBusy(false); }
  }
  return { busy, run };
}
