import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Anything under /admin that matches no real page. Without this catch-all an unmatched URL leaves the
 * admin entirely and Next renders its own unstyled 404; here it lands on `(shell)/not-found.tsx`, so the
 * sidebar, the tokens and a way back are still there. Static routes always win over a catch-all.
 */
export default function AdminUnknownRoute(): never {
  notFound();
}
