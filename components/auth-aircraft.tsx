import Image from "next/image";

export function AuthAircraft() {
  return <figure className="mx-auto mt-5 w-full max-w-xl sm:mt-8">
    <Image
      src="/images/auth-aircraft.webp"
      alt="A white passenger jet with a purple tail climbing toward the upper right, surrounded by subtle lavender flight trails and small sparkle stars."
      width={1536}
      height={1024}
      sizes="(min-width: 1024px) 576px, (min-width: 640px) 80vw, 100vw"
      className="theme-light-only h-auto w-full"
    />
    <Image
      src="/images/auth-aircraft-dark.webp"
      alt="A passenger jet with a purple tail climbing toward the upper right, with subtle stars and flight trails on a transparent background."
      width={1536}
      height={1024}
      sizes="(min-width: 1024px) 576px, (min-width: 640px) 80vw, 100vw"
      className="theme-dark-only h-auto w-full"
    />
  </figure>;
}
