"use client";
import { T, CmsText, useText } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { Brand } from "./brand";
import { UpcomingButton } from "./upcoming-button";
import { landingDefaults, type LandingCopy } from "@/lib/content/model";

const footerGroups = [
  { title: "Product", links: ["Features", "Get Started", "Blog", "Community", "Pricing"] },
  { title: "Company", links: ["About", "Contact", "Support"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service"] },
];

export function SiteFooter({ copy = landingDefaults }: { copy?: LandingCopy }) {
  const t = useText();
  return <footer className="site-container site-footer py-10 text-sm">
    <div className="grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-10">
      <div className="col-span-2 min-w-0 lg:col-span-1"><Brand /><p className="mt-3 text-xs font-bold leading-6 tracking-[0.12em] text-muted"><T id="landing.sky" /></p></div>
      {footerGroups.map(group => <nav key={group.title} aria-label={t("common.footerNav", { group: t(group.title) })}>
        <h2 className="font-bold text-ink"><T source={group.title} /></h2>
        <ul className="mt-2">{group.links.map(label => <li key={label}>
          {label === "Features" || label === "Get Started"
            ? <Link href={label === "Features" ? "/#features" : "/dashboard"} className="rounded text-muted transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"><T source={label} /></Link>
            : <UpcomingButton className="cursor-pointer rounded text-muted transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"><T source={label} /></UpcomingButton>}
        </li>)}</ul>
      </nav>)}
    </div>
    <p className="mt-10 border-t border-line pt-6 text-xs leading-6 text-muted"><CmsText id="content.copyright" source={copy["landing.footer.copyright"] || "© 2026 Flight Desk. All rights reserved."} /></p>
  </footer>;
}
