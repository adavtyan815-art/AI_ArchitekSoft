import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getAdminDict, local } from "@/lib/i18n/admin";
import { Empty } from "@/components/ui";

/**
 * Mistyped /admin/* URLs used to fall through to the unstyled Next.js 404 — a white page with none of
 * the admin chrome and no way back. This keeps the admin shell and offers the overview.
 */
export default async function AdminNotFound() {
  const { locale } = await getAdminDict();
  const X = local(
    {
      hy: { title: "Էջը չի գտնվել", text: "Այս հասցեն ադմինում գոյություն չունի։ Հնարավոր է՝ գրառումը ջնջվել է կամ հղումը սխալ է։", back: "Վերադառնալ ընդհանուրին" },
      en: { title: "Page not found", text: "This admin address does not exist. The record may have been deleted, or the link is wrong.", back: "Back to overview" },
    },
    locale
  );

  return (
    <Empty
      icon={<FileQuestion size={20} />}
      title={X.title}
      text={X.text}
      action={
        <Link href="/admin" className="btn-secondary btn-sm">
          {X.back}
        </Link>
      }
    />
  );
}
