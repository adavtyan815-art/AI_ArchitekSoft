/**
 * Brand wordmark. The logo keeps its own colours in both themes: it is the brand mark, not a UI element
 * that flips with the page. The monochrome ink/paper variants stay in /public/brand for special cases.
 */
export function BrandLogo({ className = "h-7", alt = "ArchiTek Soft" }: { className?: string; alt?: string }) {
  return (
    <span className={`inline-flex ${className}`} aria-label={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt={alt} width={300} height={132} fetchPriority="high" decoding="sync" className="h-full w-auto" />
    </span>
  );
}
