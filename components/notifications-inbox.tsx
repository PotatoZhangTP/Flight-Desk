"use client";

import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";
import { useEffect, useState } from "react";

type Item = { id: string; kind: string; title: string; body: string; is_read: boolean; created_at: string; conversation_id?: string | null; target?: string | null };

function summary(body: string) { return body.replace(/\s+/g, " ").trim() || "—"; }

export function NotificationsInbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void fetch("/api/notifications", { cache: "no-store" }).then(response => response.json()).then(body => setItems(body.notifications ?? [])).catch(() => setError(true)); }, []);

  async function setReadState(item: Item, nextIsRead = !item.is_read) {
    if (busy || item.is_read === nextIsRead) return;
    setBusy(item.id); setError(false);
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, kind: item.kind, is_read: nextIsRead }) }).catch(() => null);
    if (response?.ok) {
      setItems(current => current.map(entry => entry.id === item.id ? { ...entry, is_read: nextIsRead } : entry));
      window.dispatchEvent(new Event("flightdesk-notifications-updated"));
    } else setError(true);
    setBusy(null);
  }

  async function all() {
    if (busy) return;
    const previous = items;
    setBusy("all"); setError(false);
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }).catch(() => null);
    if (response?.ok) { setItems(current => current.map(item => ({ ...item, is_read: true }))); window.dispatchEvent(new Event("flightdesk-notifications-updated")); } else { setItems(previous); setError(true); }
    setBusy(null);
  }

  return <section className="mt-8 w-full rounded-2xl border border-line bg-surface">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5"><h2 className="font-bold"><T id="feedback.notifications" /></h2>{items.some(item => !item.is_read) && <button type="button" disabled={busy !== null} className="button-primary !min-h-9 !px-3 !py-1.5 !text-xs disabled:cursor-wait disabled:opacity-60" onClick={() => void all()}><T id="feedback.markAllRead" /></button>}</div>
    {error && <p role="alert" className="border-b border-danger-line bg-danger-bg px-4 py-3 text-sm text-danger-fg sm:px-5"><T id="common.requestError" /></p>}
    {items.length ? <div>{items.map(item => <div key={`${item.kind}-${item.id}`} className={`border-b border-line px-4 py-4 last:border-b-0 sm:px-5 ${item.is_read ? "" : "bg-brand-soft/25"}`}>
      <div className="flex min-w-0 items-start gap-2"><span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.is_read ? "bg-transparent" : "bg-red-500"}`} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{item.title}</p><p className="mt-1 truncate text-sm text-muted" title={summary(item.body)}>{summary(item.body)}</p><time className="mt-1 block text-xs text-muted">{new Date(item.created_at).toLocaleString()}</time></div></div>
      <div className="mt-3 flex flex-wrap gap-2 pl-4"><button type="button" disabled={busy !== null} className="button-primary !min-h-9 !px-3 !py-1.5 !text-xs disabled:cursor-wait disabled:opacity-60" onClick={() => void setReadState(item)}>{item.is_read ? <T id="feedback.markUnread" /> : <T id="feedback.markRead" />}</button>{item.conversation_id && <Link href={`/inbox?tab=messages&conversation=${item.conversation_id}`} className="button-primary !min-h-9 !px-3 !py-1.5 !text-xs" onClick={() => { if (!item.is_read) void setReadState(item, true); }}><T id="feedback.openChat" /></Link>}{item.target && <Link href={item.target} className="button-primary !min-h-9 !px-3 !py-1.5 !text-xs" onClick={() => { if (!item.is_read) void setReadState(item, true); }}><T id="feedback.openAchievement" /></Link>}</div>
    </div>)}</div> : <p className="p-8 text-sm text-muted"><T id="feedback.noNotifications" /></p>}
  </section>;
}
