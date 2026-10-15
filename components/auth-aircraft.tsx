export function AuthAircraft() {
  return <figure className="mx-auto mt-5 w-full max-w-xl sm:mt-8">
    <svg role="img" aria-labelledby="auth-aircraft-title auth-aircraft-description" viewBox="0 0 640 390" className="h-auto w-full" fill="none">
      <title id="auth-aircraft-title">A380-inspired aircraft illustration</title>
      <desc id="auth-aircraft-description">A shaded front-view illustration of an A380-inspired double-deck wide-body aircraft with four detailed turbofan engines, broad wings and landing gear in black, silver and purple.</desc>
      <defs>
        <linearGradient id="a380-silver"><stop stopColor="var(--line-strong)" /><stop offset=".35" stopColor="var(--surface)" /><stop offset=".65" stopColor="var(--surface)" /><stop offset="1" stopColor="var(--line-strong)" /></linearGradient>
        <radialGradient id="a380-fan"><stop stopColor="var(--muted)" /><stop offset=".5" stopColor="var(--ink)" /><stop offset="1" stopColor="var(--panel)" /></radialGradient>
      </defs>
      <ellipse cx="320" cy="337" rx="115" ry="8" fill="var(--surface-muted)" />
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="m306 138 5-95q9-21 18 0l5 95" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
        <path d="m311 57 9-14 9 14v45l-9-17-9 17Z" fill="var(--brand-soft)" />
        <path d="m294 156-89 13-22 9 113 2M346 156l89 13 22 9-113 2" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.8" />
        <path d="M294 204 68 239l-16-4 7 14 243-12M346 204l226 35 16-4-7 14-243-12" fill="url(#a380-silver)" stroke="var(--muted)" strokeWidth="1.3" />
        <path d="m74 243 213-25m66 0 213 25M165 228l3 10m61-19 2 11m180-11-2 11m66-2-3 10" stroke="var(--line-strong)" strokeWidth="1.2" />
        <path d="m59 249-7-22M581 249l7-22" stroke="var(--brand)" strokeWidth="2.5" />
        {[137, 219, 421, 503].map((x, index) => <g key={x} transform={`translate(${x} ${index === 1 || index === 2 ? 268 : 272})`}>
          <path d="m-4-24 1-17 7-1 4 20" fill="var(--line-strong)" stroke="var(--muted)" />
          <path d="M-25 0v-8c0-29 50-29 50 0v8" fill="url(#a380-silver)" stroke="var(--muted)" />
          <ellipse rx="25" ry="27" fill="url(#a380-silver)" stroke="var(--muted)" />
          <ellipse rx="20" ry="22" fill="url(#a380-fan)" />
          {Array.from({ length: 18 }, (_, blade) => <path key={blade} d="M3-4Q8-12 1-20" transform={`rotate(${blade * 20})`} stroke="var(--subtle)" strokeWidth="1" />)}
          <ellipse rx="5" ry="6" fill="var(--line-strong)" /><path d="M0-2q4 0 2 4" stroke="var(--ink)" />
          <path d="M-15-21q15-7 30 0" stroke="var(--surface)" />
        </g>)}
        {[278, 296, 344, 362].map(x => <g key={x}><path d={`M${x} 286v40`} stroke="var(--muted)" strokeWidth="3" /><rect x={x-6} y="319" width="5" height="14" rx="2" fill="var(--ink)" /><rect x={x+1} y="319" width="5" height="14" rx="2" fill="var(--ink)" /></g>)}
        <path d="M320 126c-29 0-43 20-46 53l-3 52c-2 43 15 76 49 83 34-7 51-40 49-83l-3-52c-3-33-17-53-46-53Z" fill="url(#a380-silver)" stroke="var(--muted)" strokeWidth="1.3" />
        <path d="M291 226q29-15 58 0l-3 12q-26-10-52 0Z" fill="var(--ink)" />
        <path d="M320 220v16" stroke="var(--surface)" strokeWidth="2" />
        <path d="M280 178q40-17 80 0M276 204q44-14 88 0" stroke="var(--line-strong)" />
        <path d="m283 175 7-3v7l-7 3Zm74 0-7-3v7l7 3ZM279 200l7-3v7l-7 3Zm82 0-7-3v7l7 3Z" fill="var(--muted)" />
        <path d="M279 252q41 12 82 0" stroke="var(--brand)" strokeWidth="1.5" opacity=".6" />
        <path d="M287 253q33-10 66 0M296 294q24 9 48 0" stroke="var(--line-strong)" strokeWidth="1.2" />
        <ellipse cx="320" cy="277" rx="14" ry="9" stroke="var(--line-strong)" />
        <path d="M320 314v24m-7-19h14" stroke="var(--muted)" strokeWidth="3" />
        <rect x="311" y="330" width="7" height="13" rx="2.5" fill="var(--ink)" /><rect x="322" y="330" width="7" height="13" rx="2.5" fill="var(--ink)" />
      </g>
    </svg>
  </figure>;
}
