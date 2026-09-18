/**
 * The /p/[slug] segment has no chrome of its own.
 *
 * The brand bar, the language tag and the footer are rendered by the page (and by
 * not-found.tsx) through <PortalChrome>, because a layout never receives the ?k=
 * key: it cannot tell a client holding the link from someone guessing a slug, and
 * showing the link's language to the second one reveals that the slug exists.
 */
export const dynamic = "force-dynamic";

export default function PortalSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
