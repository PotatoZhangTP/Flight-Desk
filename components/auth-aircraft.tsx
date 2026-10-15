export function AuthAircraft() {
  return <figure className="mx-auto mt-5 w-full max-w-xl sm:mt-8">
    <svg role="img" aria-labelledby="auth-aircraft-title auth-aircraft-description" viewBox="0 0 640 390" className="h-auto w-full" fill="none">
      <title id="auth-aircraft-title">Onward to your next journey</title>
      <desc id="auth-aircraft-description">A slender passenger jet in side view, climbing gently to the right, with clean charcoal outlines and a purple tail.</desc>
      <g transform="rotate(-9 320 200)" strokeLinecap="round" strokeLinejoin="round">
        {/* A single, gently tapered fuselage rather than a diagram of parts. */}
        <path d="M108 203 78 127q-2-5 4-5h20q5 0 8 5l49 63 320-3q22 0 40 13l22 14q9 7-3 12-20 7-48 7H194q-48 0-86-30Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
        <path d="m87 131 27 65 31-4-43-61Z" fill="var(--brand)" opacity=".85" />
        <path d="m115 166 16 25" stroke="var(--surface)" strokeWidth="2" />
        {/* Swept wing and a simple engine nacelle, with no mechanical clutter. */}
        <path d="m323 224 42 22h57q8 0 8 8t-8 8h-35q-8 0-13-5l-39-27" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.8" />
        <path d="m268 215 82 72q5 4 12 4h22l-54-77" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
        <path d="m353 280 9 7h14" stroke="var(--brand)" strokeWidth="2.5" />
        <path d="m166 215-54 24q-5 2-10 1l-10-3 44-29" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.8" />
        <path d="m491 196 14 6 10 8h-23Z" fill="var(--ink)" />
        {Array.from({ length: 19 }, (_, index) => <rect key={index} x={190 + index * 14} y="201" width="4" height="6" rx="2" fill="var(--muted)" />)}
        <rect x="168" y="198" width="9" height="22" rx="3" stroke="var(--line-strong)" strokeWidth="1.3" />
        <rect x="468" y="198" width="9" height="22" rx="3" stroke="var(--line-strong)" strokeWidth="1.3" />
        <path d="M196 225h57m175 0h40" stroke="var(--line)" strokeWidth="1.5" />
      </g>
      <path d="M83 281h75m-53 12h29" stroke="var(--line-strong)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </figure>;
}
