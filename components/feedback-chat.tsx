"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { T, useText, LocalizedDate } from "@/components/i18n";

type Message = { id: string; conversation_id: string; sender_id: string | null; sender_type: "user" | "admin" | "system"; message_type: string; content: string; created_at: string };
type Conversation = { id: string; user_id: string; status: "open" | "closed"; last_activity_at: string; unread_count: number; feedback_submissions: { title: string; type: "feature" | "bug"; description: string; submitter_email: string | null } | null; last_message: Message | null; messages?: Message[] };

export function FeedbackChat({ adminOnly = false }: { adminOnly?: boolean }) {
  const t = useText();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("conversation") || "";
  const [items, setItems] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const selected = items.find(item => item.id === selectedId) ?? null;
  const filtered = items.filter(item => filter === "all" || item.status === filter || (filter === "unread" && item.unread_count > 0));

  async function load(id = selectedId) {
    const query = id ? `?conversation=${encodeURIComponent(id)}` : "";
    const response = await fetch(`/api/feedback/conversations${query}`, { cache: "no-store" });
    if (!response.ok) { setError("feedback.chatLoadError"); setLoading(false); return; }
    const body = await response.json();
    setItems(current => id ? current.map(item => body.conversations?.[0]?.id === item.id ? body.conversations[0] : item) : body.conversations ?? []);
    if (!id && body.conversations?.length && !selectedId) setSelectedId(requestedId || body.conversations[0].id);
    setLoading(false);
  }
  useEffect(() => { void load(); const timer = setInterval(() => { if (document.visibilityState === "visible") void load(selectedId); }, 15000); return () => clearInterval(timer); }, [selectedId, requestedId]);
  async function select(id: string) { setSelectedId(id); await load(id); await fetch("/api/feedback/conversations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: id }) }); setItems(current => current.map(item => item.id === id ? { ...item, unread_count: 0 } : item)); }
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (!selected || selected.status !== "open" || sending || !content.trim()) return;
    setSending(true); setError(""); const draft = content; setContent("");
    const response = await fetch("/api/feedback/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected.id, content: draft }) });
    if (!response.ok) { setContent(draft); setError((await response.json().catch(() => ({}))).error || "feedback.chatSendError"); setSending(false); return; }
    await load(selected.id); setSending(false);
  }
  async function changeStatus(next: "open" | "closed") {
    if (!selected || statusBusy || next !== "closed" || !window.confirm(t("feedback.closeConfirm"))) return;
    setStatusBusy(true); setError(""); const response = await fetch("/api/feedback/conversations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected.id, status: next }) });
    if (!response.ok) setError("feedback.chatStatusError"); else await load(selected.id); setStatusBusy(false);
  }
  if (loading) return <div className="mt-8 h-56 rounded-2xl border border-line skeleton-shimmer" aria-label="Loading messages" />;
  return <section className="mt-10">
    <div className="flex items-end justify-between gap-3"><div><p className="eyebrow"><T id="feedback.messages" /></p><h2 className="mt-2 text-2xl font-bold"><T id={adminOnly ? "feedback.adminChats" : "feedback.conversationHistory"} /></h2></div>{error && <p role="alert" className="text-sm text-danger-fg"><T id={error} /></p>}</div>
    <div className="mt-5 flex flex-wrap gap-2">{[["all", "feedback.all"], ["unread", "feedback.unread"], ["open", "feedback.status.open"], ["closed", "feedback.status.closed"]].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value as typeof filter)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === value ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-muted"}`}><T id={label} /></button>)}</div>
    <div className="mt-3 grid min-h-[520px] overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)]"><aside className="border-b border-line lg:border-b-0 lg:border-r">{filtered.length ? filtered.map(item => <button type="button" key={item.id} onClick={() => void select(item.id)} className={`block w-full border-b border-line p-4 text-left ${selected?.id === item.id ? "bg-brand-soft" : "hover:bg-surface-muted"}`}><div className="flex items-center gap-2"><p className="truncate font-bold">{item.feedback_submissions?.title}</p>{item.unread_count > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label={t("feedback.unread")} />}</div><p className="mt-1 text-xs text-muted"><T id={item.feedback_submissions?.type === "bug" ? "feedback.bug" : "feedback.feature"} /> · <T id={item.status === "open" ? "feedback.status.open" : "feedback.status.closed"} /></p><p className="mt-2 truncate text-sm text-muted">{item.last_message?.content}</p><LocalizedDate value={item.last_activity_at} /></button>) : <p className="p-6 text-sm text-muted"><T id="feedback.noChats" /></p>}</aside>
      <div className="flex min-w-0 flex-col">{selected ? <><header className="border-b border-line p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold">{selected.feedback_submissions?.title}</h3><p className="mt-1 text-sm text-muted"><T id={selected.status === "open" ? "feedback.status.open" : "feedback.status.closed"} /></p></div>{selected.status === "open" && <button type="button" className="button-secondary" disabled={statusBusy} onClick={() => void changeStatus("closed")}><T id="feedback.closeChat" /></button>}</div></header><div className="flex-1 space-y-4 overflow-y-auto p-5">{(selected.messages ?? []).map(message => { const own = adminOnly ? message.sender_type === "admin" : message.sender_type === "user"; return <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${own ? "bg-brand text-white" : message.sender_type === "system" ? "bg-surface-muted text-muted" : "border border-line bg-surface-muted"}`}><p className="mb-1 text-xs font-semibold opacity-75">{message.sender_type === "admin" ? t("feedback.support") : message.sender_type === "system" ? t("feedback.system") : t("feedback.you")}</p><p className="whitespace-pre-wrap break-words">{message.content}</p><p className="mt-2 text-[11px] opacity-70"><LocalizedDate value={message.created_at} /> {new Date(message.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p></div></div>; })}</div>{selected.status === "open" ? <form onSubmit={send} className="flex gap-2 border-t border-line p-4"><textarea value={content} onChange={event => setContent(event.target.value)} rows={2} maxLength={12000} placeholder={t("feedback.messagePlaceholder")} className="min-w-0 flex-1 resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand" /><button type="submit" className="button-primary self-end" disabled={sending || !content.trim()}>{sending ? <T id="feedback.sending" /> : <T id="feedback.sendMessage" />}</button></form> : <p className="border-t border-line p-4 text-center text-sm text-muted"><T id="feedback.closedPermanent" /></p>}</> : <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted"><T id="feedback.selectChat" /></div>}</div></div>
  </section>;
}
