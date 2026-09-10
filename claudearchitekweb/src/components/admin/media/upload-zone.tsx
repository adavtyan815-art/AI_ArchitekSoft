"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadError = { name: string; error: string };

/** Drag & drop / click upload zone. Posts multipart "files" to /api/admin/upload, then refreshes the page. */
export function UploadZone({ projectId, kindHint, label = "Drop files here or click to choose", className }: { projectId?: string | null; kindHint?: string; label?: string; className?: string }) {
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
      const json = (await res.json()) as { assets?: unknown[]; errors?: UploadError[]; error?: string };
      if (!res.ok && json.error) {
        setErrors([{ name: "Upload", error: json.error }]);
      } else {
        setMsg(`Uploaded ${json.assets?.length ?? 0} file(s)`);
        setErrors(json.errors ?? []);
        router.refresh();
      }
    } catch (e) {
      setErrors([{ name: "Upload", error: (e as Error).message }]);
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
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          over ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-ink-50 hover:border-ink-300",
          busy && "pointer-events-none opacity-60"
        )}
      >
        <UploadCloud size={22} className="text-ink-400" />
        <div className="text-sm font-medium text-ink-800">{busy ? "Uploading…" : label}</div>
        <div className="text-xs text-ink-500">Images, video, PDF, GLB/USDZ, DWG — up to 1 GB per file</div>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && send(e.target.files)} />
      </div>
      {msg ? <div className="mt-2 text-xs font-medium text-success-500">{msg}</div> : null}
      {errors.length ? (
        <ul className="mt-2 space-y-0.5 text-xs text-danger-500">
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
