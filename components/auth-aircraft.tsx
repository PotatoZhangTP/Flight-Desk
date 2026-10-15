export function AuthAircraft() {
  return <figure className="mx-auto mt-5 w-full max-w-xl sm:mt-8">
    <svg role="img" aria-labelledby="auth-aircraft-title auth-aircraft-description" viewBox="0 0 640 390" className="h-auto w-full" fill="none">
      <title id="auth-aircraft-title">A journey taking flight</title>
      <desc id="auth-aircraft-description">A clean line illustration of a passenger airplane seen from above, banking gently along a curved purple flight path.</desc>
      <path d="M100 304c-32-42 15-91 73-69 65 25 20 100-33 81-45-16-27-67 30-66h89" stroke="var(--line-strong)" strokeWidth="1.5" strokeDasharray="4 8" strokeLinecap="round" />
      <circle cx="91" cy="277" r="4" fill="var(--brand)" />
      <g transform="translate(351 184) rotate(35)" strokeLinecap="round" strokeLinejoin="round">
        {/* One continuous silhouette keeps the illustration light and legible. */}
        <path d="M0-132c-9 0-14 17-14 32v55L-119 22c-6 4-8 8-8 13v6l113-35v70l-33 26v13l40-13q7 6 14 0l40 13v-13L14 76V6l113 35v-6c0-5-2-9-8-13L14-45v-55c0-15-5-32-14-32Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.3" />
        {/* Discrete engine pods and a restrained violet wingtip accent. */}
        <path d="M-64-16v26q7 5 14-1v-33m114 8v26q-7 5-14-1v-33" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.8" />
        <path d="m-126 33 15-5m237 5-15-5" stroke="var(--brand)" strokeWidth="3" />
        <path d="M-8-99q8-6 16 0l2 9q-10-4-20 0Z" fill="var(--ink)" />
        <path d="M0-77V83" stroke="var(--line)" strokeWidth="1.3" />
        <path d="m-43 105 30-10m56 10-30-10" stroke="var(--brand)" strokeWidth="2" />
        {[-67, -54, -41, -28, -15, -2, 11, 24, 37, 50, 63].map(y => <g key={y} stroke="var(--muted)" strokeWidth="2" opacity=".65"><path d={`M-9 ${y}v3m18-3v3`} /></g>)}
      </g>
      <path d="M493 100h16m-8-8v16" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
      <circle cx="470" cy="306" r="3" fill="var(--line-strong)" />
    </svg>
  </figure>;
}
