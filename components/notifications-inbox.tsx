"use client";

import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";
import { useEffect, useState } from "react";

type Item = { id: string; kind: string; title: string; body: string; is_read: boolean; created_at: string; conversation_id?: string | null; target?: string | null };
export function NotificationsInbox() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { void fetch("/api/notifications", { cache: "no-store" }).then(response => response.json()).then(body => setItems(body.notifications ?? [])); }, []);
  async function read(item: Item) { if (!item.is_read) { setItems(current => current.map(entry => entry.id === item.id ? { ...entry, is_read: true } : entry)); await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, kind: item.kind }) }); } }
  async function all() { setItems(current => current.map(item => ({ ...item, is_read: true }))); await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }); }
  return <section className="mt-8 max-w-3xl rounded-2xl border border-line bg-surface"><div className="flex items-center justify-between border-b border-line p-5"><h2 className="font-bold"><T id="feedback.notifications" /></h2>{items.some(item => !item.is_read) && <button type="button" className="text-sm font-semibold text-brand" onClick={() => void all()}><T id="feedback.markAllRead" /></button>}</div>{items.length ? items.map(item => <div key={`${item.kind}-${item.id}`} className={`border-b border-line p-5 ${item.is_read ? "" : "bg-brand-soft/25"}`}><div className="flex items-start justify-between gap-4"><div><p className="font-bold">{item.title}</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{item.body}</p></div><time className="shrink-0 text-xs text-muted">{new Date(item.created_at).toLocaleString()}</time></div><div className="mt-4 flex gap-3"><button type="button" className="text-sm font-semibold text-brand" onClick={() => void read(item)}>{item.is_read ? <T id="feedback.read" /> : <T id="feedback.markRead" />}</button>{item.conversation_id && <Link href={`/inbox?tab=messages&conversation=${item.conversation_id}`} className="text-sm font-semibold text-brand" onClick={() => void read(item)}><T id="feedback.openChat" /></Link>}{item.target && <Link href={item.target} className="text-sm font-semibold text-brand" onClick={() => void read(item)}><T id="feedback.openAchievement" /></Link>}</div></div>) : <p className="p-8 text-sm text-muted"><T id="feedback.noNotifications" /></p>}</section>;
}
