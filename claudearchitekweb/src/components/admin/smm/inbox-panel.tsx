import { FolderInput } from "lucide-react";
import { Panel } from "@/components/admin/shell";
import { SubmitButton } from "@/components/admin/form-buttons";
import { RelTime } from "@/components/admin/rel-time";
import type { InboxEntry } from "@/lib/inbox";
import type { AdminDict, AdminLocale } from "@/lib/i18n/admin";
import { formatBytes } from "@/lib/utils";
import { importInboxForm } from "@/app/admin/actions/smm-actions";

/**
 * What is waiting in the local drop folder. Each row says whether the copy has finished, because
 * that is the one thing the owner cannot see from the file manager: a folder is imported only once
 * nothing in it has changed for 30 seconds.
 */
export function InboxPanel({ entries, root, L, locale }: { entries: InboxEntry[]; root: string; L: AdminDict["smm"]["inbox"]; locale: AdminLocale }) {
  const ready = entries.filter((e) => e.stable).length;
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <FolderInput size={15} aria-hidden /> {L.title}
          {entries.length ? <span className="num text-[11px] text-accent">{entries.length}</span> : null}
        </span>
      }
      actions={
        ready > 1 ? (
          <form action={importInboxForm}>
            <SubmitButton variant="primary" className="btn-sm" pendingText={L.importing}>
              {L.importAll}
            </SubmitButton>
          </form>
        ) : null
      }
    >
      <p className="caption mb-3">
        {L.subtitle} <span className="text-faint">·</span> {L.pathLabel}: <code className="font-mono text-[11px] break-all text-fg-2">{root}</code>
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">
          {L.empty} <span className="text-faint">{L.emptyHint}</span>
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="table-admin table-responsive">
            <thead>
              <tr>
                <th>{L.colFolder}</th>
                <th>{L.colFiles}</th>
                <th>{L.colSize}</th>
                <th>{L.colAge}</th>
                <th>{L.colState}</th>
                <th className="num" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={`${e.kind}:${e.name}`}>
                  <td data-label={L.colFolder}>
                    <span className="font-semibold text-fg">{e.name}</span>
                    {e.hasBrief ? <span className="ml-1.5 font-mono text-[10px] tracking-[0.06em] text-accent uppercase">{L.withBrief}</span> : null}
                  </td>
                  <td data-label={L.colFiles} className="num text-[12px]">
                    {e.usableCount}
                    {e.usableCount !== e.fileCount ? <span className="text-faint"> / {e.fileCount}</span> : null}
                  </td>
                  <td data-label={L.colSize} className="num text-[12px] whitespace-nowrap text-muted">{formatBytes(e.totalBytes, locale)}</td>
                  <td data-label={L.colAge} className="text-[12px] whitespace-nowrap text-muted">
                    <RelTime iso={new Date(e.newestMtimeMs).toISOString()} locale={locale} />
                  </td>
                  <td data-label={L.colState}>
                    {/* An empty folder is never stable, so without this it would say "still copying"
                        for ever — which is exactly the wrong hint for a folder nothing was put in.
                        A folder that only looks empty (files too deep, nothing but Thumbs.db) is not
                        one of those: it reads as ready and says what was skipped underneath. */}
                    {e.fileCount === 0 && !e.stable ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
                        <span aria-hidden className="h-1.5 w-1.5 bg-faint" /> {L.emptyFolder}
                      </span>
                    ) : e.stable ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-success">
                        <span aria-hidden className="h-1.5 w-1.5 bg-success" /> {L.stable}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-warning" title={L.waitingHint}>
                        <span aria-hidden className="h-1.5 w-1.5 bg-warning" /> {L.waiting}
                      </span>
                    )}
                    {e.usableCount === 0 && !e.notes.length ? <div className="text-[11px] text-faint">{L.noUsable}</div> : null}
                    {/* Anything the file column cannot show: files below the depth that is read, a
                        folder holding nothing but Thumbs.db. Without these the panel said "Empty"
                        about a folder the owner could see four renders in. */}
                    {e.notes.map((note) => (
                      <div key={note} className="text-[11px] text-warning">
                        {note}
                      </div>
                    ))}
                  </td>
                  <td data-label="">
                    <div className="flex justify-end">
                      <form action={importInboxForm}>
                        <input type="hidden" name="folder" value={e.name} />
                        <SubmitButton variant="secondary" className="btn-sm" pendingText={L.importing}>
                          {L.importNow}
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="caption mt-3">{L.docs}</p>
    </Panel>
  );
}
