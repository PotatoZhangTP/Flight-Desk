import Link from "next/link";
import { Brand } from "./brand";
import { landingDefaults, type LandingCopy } from "@/lib/content/model";

export function SiteFooter({ copy = landingDefaults }: { copy?: LandingCopy }) {
  return <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 py-10 text-sm sm:flex-row sm:flex-wrap sm:items-center lg:px-12"><Brand /><p className="whitespace-pre-line text-muted">{copy["landing.footer.tagline"]}</p><Link className="whitespace-pre-line font-semibold text-muted hover:text-brand" href="/roadmap">{copy["landing.footer.link_label"]} ↗</Link>{copy["landing.footer.copyright"] && <p className="basis-full whitespace-pre-line text-xs text-muted">{copy["landing.footer.copyright"]}</p>}</footer>;
}
