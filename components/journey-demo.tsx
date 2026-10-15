export function JourneyDemo() {
  return <figure aria-label="Product demo of an illustrative flight ticket, not a real user record" className="relative mx-auto w-full max-w-xl">
    <div className="pointer-events-none absolute -inset-4 rounded-full bg-[#9fd8d2]/30 blur-3xl" />
    <div className="relative overflow-hidden rounded-[2rem] border border-[#d9e2ec] bg-white shadow-2xl shadow-[#102a43]/10">
      <div className="flex items-center justify-between border-b border-[#edf2f7] px-6 py-4"><span className="text-xs font-bold uppercase tracking-[0.15em] text-[#627d98]">A journey, captured</span><span className="rounded-full bg-[#fff0e4] px-3 py-1 text-xs font-bold text-[#a64b20]">Product demo</span></div>
      <div className="relative overflow-hidden bg-[#102a43] px-6 pb-8 pt-7 text-white sm:px-8">
        <svg aria-hidden="true" viewBox="0 0 500 210" className="mb-3 w-full text-[#9fd8d2]" fill="none">
          <ellipse cx="250" cy="110" rx="208" ry="88" stroke="currentColor" opacity=".15" /><ellipse cx="250" cy="110" rx="125" ry="88" stroke="currentColor" opacity=".12" /><path d="M45 110h410M70 70h360M70 150h360M250 22v176" stroke="currentColor" opacity=".12" />
          <path d="M78 148 Q250 -20 422 100" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" className="flight-trail" />
          <circle cx="78" cy="148" r="6" fill="#e8753a" /><circle cx="422" cy="100" r="6" fill="#9fd8d2" /><text x="235" y="66" fill="white" fontSize="29" transform="rotate(-7 235 66)">✈</text>
          <text x="66" y="176" fill="#bcccdc" fontSize="12">LONDON</text><text x="390" y="130" fill="#bcccdc" fontSize="12">TOKYO</text>
        </svg>
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-[#9fd8d2]">Departure</p><p className="mt-2 text-xl font-bold sm:text-2xl">London Heathrow</p><p className="mt-2 text-xs text-[#bcccdc]">LHR · EGLL</p></div><span aria-hidden="true" className="text-xl text-[#f8a779]">→</span><div className="text-right"><p className="text-xs uppercase tracking-wider text-[#9fd8d2]">Arrival</p><p className="mt-2 text-xl font-bold sm:text-2xl">Tokyo Haneda</p><p className="mt-2 text-xs text-[#bcccdc]">HND · RJTT</p></div></div>
      </div>
      <div className="grid grid-cols-3 gap-3 border-b border-dashed border-[#bcccdc] px-6 py-5 text-sm"><div><p className="text-xs text-[#627d98]">Your routes</p><p className="mt-1 font-bold">All together</p></div><div><p className="text-xs text-[#627d98]">Local times</p><p className="mt-1 font-bold">In perspective</p></div><div><p className="text-xs text-[#627d98]">Your memories</p><p className="mt-1 font-bold">Worth keeping</p></div></div>
      <figcaption className="bg-[#fff8f3] px-6 py-4 text-xs leading-5 text-[#627d98]">Illustrative product preview. This route is an example, not a user’s flight or live flight data.</figcaption>
    </div>
  </figure>;
}
