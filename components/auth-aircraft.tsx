import Image from "next/image";

export function AuthAircraft() {
  return <figure className="mx-auto mt-5 w-full max-w-xl sm:mt-8">
    <Image
      src="/images/auth-aircraft.webp"
      alt="A passenger jet with two swept wings, twin engines and a purple tail, illustrated against a white background."
      width={1536}
      height={1024}
      sizes="(min-width: 1024px) 576px, (min-width: 640px) 80vw, 100vw"
      className="h-auto w-full"
    />
  </figure>;
}
