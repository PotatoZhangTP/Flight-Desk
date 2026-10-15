import Link from "next/link";
import { Brand } from "./brand";

export function SiteFooter() {
  return <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 py-10 text-sm sm:flex-row sm:items-center lg:px-12"><Brand /><p className="text-[#627d98]">For the love of the journey.</p><Link className="font-semibold text-[#486581] hover:text-[#168c82]" href="/roadmap">Product roadmap ↗</Link></footer>;
}
