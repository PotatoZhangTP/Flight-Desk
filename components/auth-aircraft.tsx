export function AuthAircraft() {
  return <figure className="mx-auto mt-5 w-full max-w-xl sm:mt-8">
    <svg role="img" aria-labelledby="auth-aircraft-title auth-aircraft-description" viewBox="0 0 640 390" className="h-auto w-full" fill="none">
      <title id="auth-aircraft-title">A380-inspired aircraft illustration</title>
      <desc id="auth-aircraft-description">A minimal front view of a large double-deck airliner with four engines and broad swept wings, drawn in black, silver and purple.</desc>
      <path d="M65 330Q320 365 575 330" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="4 7" />
      <ellipse cx="320" cy="337" rx="115" ry="8" fill="var(--surface-muted)" />
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="m306 138 5-95q9-21 18 0l5 95" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
        <path d="m311 57 9-14 9 14v45l-9-17-9 17Z" fill="var(--brand-soft)" />
        <path d="m294 156-89 13-22 9 113 2M346 156l89 13 22 9-113 2" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.8" />
        <path d="M294 185 85 245l-27 20 244-39M346 185l209 60 27 20-244-39" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
        <path d="m93 246 200-46M547 246l-200-46" stroke="var(--line-strong)" strokeWidth="1.2" />
        <path d="m59 265-7-22M581 265l7-22" stroke="var(--brand)" strokeWidth="3" />
        <path d="m151 241-2 16m73-33-2 38m269-21 2 16m-73-33 2 38" stroke="var(--ink)" strokeWidth="2" />
        {[150, 220, 420, 490].map((x, index) => <g key={x} transform={`translate(${x} ${index === 1 || index === 2 ? 274 : 267})`}><path d="M-20 0v-9c0-13 40-13 40 0v9" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.8" /><ellipse rx="20" ry="23" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.8" /><ellipse rx="13" ry="16" fill="var(--surface-muted)" stroke="var(--line-strong)" /><circle r="4" fill="var(--brand)" /><path d="m0-13 3 9m8 0-8 5m-3 12-3-9m-8 0 8-5" stroke="var(--subtle)" strokeWidth="1" /></g>)}
        <path d="M320 119c-25 0-36 32-39 76l-3 58c-2 31 12 58 42 65 30-7 44-34 42-65l-3-58c-3-44-14-76-39-76Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.2" />
        <path d="M291 226q29-15 58 0l-3 12q-26-10-52 0Z" fill="var(--ink)" />
        <path d="M320 220v16" stroke="var(--surface)" strokeWidth="2" />
        <path d="M292 199q28-9 56 0M294 181q26-8 52 0" stroke="var(--brand)" strokeWidth="2" strokeDasharray="3 5" />
        <path d="M287 253q33-10 66 0M296 294q24 9 48 0" stroke="var(--line-strong)" strokeWidth="1.2" />
        <path d="M320 319v12m-8 0h16" stroke="var(--ink)" strokeWidth="2" />
      </g>
      <circle cx="63" cy="330" r="3" fill="var(--brand)" /><circle cx="577" cy="330" r="3" fill="var(--brand)" />
    </svg>
    <figcaption className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Inspired by the A380. Made for every journey.</figcaption>
  </figure>;
}
