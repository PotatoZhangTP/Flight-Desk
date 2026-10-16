import Link from "@/components/navigation-link";
import { T } from "@/components/i18n";
import { LanguageSelector } from "@/components/language-selector";
export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-page px-6"><section className="w-full max-w-md rounded-2xl border border-line bg-surface p-8"><LanguageSelector /><h1 className="mt-6 text-2xl font-bold"><T id="common.notFoundTitle" /></h1><p className="mt-3 text-muted"><T id="common.notFoundHelp" /></p><Link href="/" className="mt-6 inline-block rounded-full bg-brand px-5 py-3 font-bold text-on-brand"><T id="common.backHome" /></Link></section></main>;
}
