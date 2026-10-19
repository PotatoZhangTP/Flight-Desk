import { T, StatisticValue } from "@/components/i18n";

const statAccent: Record<string, string> = {
  "Total Flights": "bg-[#7554C8]",
  "Flight Time": "bg-[#4F83D1]",
  Airports: "bg-[#36A6A0]",
  Countries: "bg-[#E6A04B]",
  Aircraft: "bg-[#D77BA4]",
  "Total Distance": "bg-[#6474C8]",
};

export function StatCard({ label, value, detail, accent }: { label: string; value: string; detail?: string; accent?: string }) {
  const display = label === "Flight Time" && detail ? (value === "0h" ? detail : `${value} ${detail}`) : value;
  return <div className="spotlight-card w-full min-w-0 rounded-2xl border border-line bg-surface p-3.5 shadow-sm shadow-ink/5 sm:p-4"><div className={`mb-2.5 h-1.5 w-10 rounded-full ${statAccent[label] || accent || "bg-brand"}`} /><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle"><T source={label} /></p><p className="mt-2 whitespace-nowrap text-2xl font-bold tracking-tight text-ink"><StatisticValue value={display} /></p></div>;
}
