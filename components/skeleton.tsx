export function Skeleton({ className = "" }: { className?: string }) { return <span aria-hidden="true" className={`skeleton-shimmer block rounded-lg ${className}`} />; }
