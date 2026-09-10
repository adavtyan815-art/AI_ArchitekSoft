/**
 * Monochrome wordmark: ink on paper in light mode, paper on graphite in dark mode.
 * The original two-tone blue logo stays in /public/brand/logo.png for print/social use.
 */
export function BrandLogo({ className = "h-7", alt = "ArchiTek Soft" }: { className?: string; alt?: string }) {
  return (
    <span className={`inline-flex ${className}`} aria-label={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-ink.png" alt={alt} width={300} height={132} className="h-full w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-paper.png" alt="" aria-hidden width={300} height={132} className="hidden h-full w-auto dark:block" />
    </span>
  );
}
