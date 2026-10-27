import { MemorialArtwork } from "@/components/memorial-artwork";

/** Shared, non-interactive memorial ornament used on dark Memorial Flight cards. */
export function MemorialDecoration({ type, tone, className = "" }: { type?: string | null; tone?: string | null; className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none select-none ${className}`}>
      <MemorialArtwork type={type} tone={tone} />
    </div>
  );
}
