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
  return <footer className="mx-auto max-w-7xl px-6 py-10 text-sm lg:px-12">
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div><Brand /><p className="mt-4 text-xs font-bold leading-6 tracking-[0.12em] text-muted">FOR EVERYONE WHO LOVES THE SKY</p></div>
      {footerGroups.map(group => <nav key={group.title} aria-label={group.title + " footer navigation"}>
        <h2 className="font-bold text-ink">{group.title}</h2>
        <ul className="mt-4 space-y-3">{group.links.map(label => <li key={label}>
          {label === "Features" || label === "Get Started"
            ? <Link href={label === "Features" ? "/#features" : "/dashboard"} className="rounded text-muted transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{label}</Link>
            : <UpcomingButton className="cursor-pointer rounded text-muted transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{label}</UpcomingButton>}
        </li>)}</ul>
      </nav>)}
    </div>
    <p className="mt-10 border-t border-line pt-6 text-xs leading-6 text-muted">{copy["landing.footer.copyright"] || "© 2026 Flight Desk. All rights reserved."}</p>
  </footer>;
}
