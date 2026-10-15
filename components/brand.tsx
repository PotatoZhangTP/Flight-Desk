import Link from "next/link";
import Image from "next/image";

export function Brand() {
  return <Link href="/" aria-label="Flight Desk home" className="inline-flex shrink-0 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
    <Image src="/images/flight-desk-logo.svg" alt="Flight Desk" width={900} height={248} className="h-10 w-auto sm:h-11" unoptimized />
  </Link>;
}
