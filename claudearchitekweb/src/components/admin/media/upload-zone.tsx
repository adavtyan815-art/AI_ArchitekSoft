"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadError = { name: string; error: string };

export type UploadLabels = {
  /** Idle prompt shown inside the drop zone. */
  label: string;
  /** Small print under the prompt (accepted types, size limit). */
  hint: string;
  /** Shown while the request is in flight. */
  busy: string;
  /** Success template containing `{n}`. */
  uploaded: string;
  /** Prefix used for a failed request. */
  failed: string;
  /** Shown when the server (or the proxy in front of it) rejects the request as too large. */
  tooLarge?: string;
};

/** Drag & drop / click upload zone. Posts multipart "files" to /api/admin/upload, then refreshes the page. */
export function UploadZone({ projectId, kindHint, labels, className }: { projectId?: string | null; kindHint?: string; labels: UploadLabels; className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<UploadError[]>([]);

  async function send(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    setMsg(null);
    setErrors([]);
    const fd = new FormData();
    for (const f of list) fd.append("files", f);
    if (projectId) fd.append("projectId", projectId);
    if (kindHint) fd.append("kindHint", kindHint);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      // A proxy that rejects an oversized body answers with HTML, not JSON, so the body is only
      // parsed when the server says it is JSON.
      const isJson = (res.headers.get("content-type") ?? "").includes("application/json");
      const json = isJson ? ((await res.json()) as { assets?: unknown[]; errors?: UploadError[]; error?: string }) : {};
      const saved = json.assets?.length ?? 0;
      if (!res.ok || !saved) {
        // Nothing was stored: show why, and never the green "uploaded 0 file(s)" line.
        const tooLarge = res.status === 413 ? (labels.tooLarge ?? labels.hint) : null;
        setMsg(null);
        setErrors(json.errors?.length ? json.errors : [{ name: labels.failed, error: tooLarge ?? json.error ?? `HTTP ${res.status}` }]);
      } else {
        setMsg(labels.uploaded.replace("{n}", String(saved)));
        setErrors(json.errors ?? []);
        router.refresh();
      }
    } catch (e) {
      setErrors([{ name: labels.failed, error: (e as Error).message }]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer?.files?.length) void send(e.dataTransfer.files);
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "grid-paper flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-5 py-7 text-center transition-colors sm:px-6 sm:py-9",
          over ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2/60 hover:border-accent",
          busy && "pointer-events-none opacity-60"
        )}
      >
        <UploadCloud size={20} className="text-muted" />
        <div className="text-[13.5px] font-semibold text-fg">{busy ? labels.busy : labels.label}</div>
        <div className="caption">{labels.hint}</div>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && send(e.target.files)} />
      </div>
      {msg ? <div className="mt-2 font-mono text-[11px] text-success">{msg}</div> : null}
      {errors.length ? (
        <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-danger">
          {errors.map((e, i) => (
            <li key={i}>
              {e.name}: {e.error}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
