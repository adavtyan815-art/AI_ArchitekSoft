"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { localePath, type Dictionary, type Locale } from "@/lib/i18n";
import { Button, Field, Index, Input, Select, Textarea, Ticks } from "@/components/ui";
import { trackEvent } from "@/components/site/track";
import { cn, formatBytes } from "@/lib/utils";

type Segment = "b2c" | "b2b";
type Upload = { key: string; name: string; size: number; progress: number; status: "uploading" | "done" | "error"; id?: string; thumb?: string; preview?: string; error?: string };

/** Only what the wizard renders — the whole dictionary never reaches the client. */
export type StartStrings = Dictionary["start"];
export type StartCommon = Pick<Dictionary["common"], "back" | "next" | "sending">;

/** Strings that are not in the shared dictionaries (wizard-only helper text). */
type Local = {
  stepOf: string;
  of: string;
  chooseSegment: string;
  needContact: string;
  needConsent: string;
  uploadFailed: string;
  tooLarge: string;
  remove: string;
  uploading: string;
  choose: string;
  error: string;
  waitUploads: string;
  requestNo: string;
  /** `{max}` = the total cap, `{n}` = how many files of this selection were not added. */
  maxFiles: string;
  tooManyUploads: string;
  quota: string;
  unsupported: string;
  filesRejected: string;
  tooManyRequests: string;
  sentKicker: string;
  /** `{channel}` = the channel the visitor picked. */
  willContact: string;
  copy: string;
  copied: string;
};
const LOCAL: Record<Locale, Local> = {
  hy: {
    stepOf: "Քայլ",
    of: "/",
    chooseSegment: "Ընտրեք տարբերակներից մեկը",
    needContact: "Խնդրում ենք լրացնել անունն ու հեռախոսը։",
    needConsent: "Անհրաժեշտ է Ձեր համաձայնությունը։",
    uploadFailed: "Չհաջողվեց վերբեռնել",
    tooLarge: "Ֆայլը մեծ է 50 ՄԲ-ից",
    remove: "Հեռացնել",
    uploading: "Վերբեռնվում է…",
    choose: "Ընտրել…",
    error: "Չհաջողվեց ուղարկել։ Խնդրում ենք փորձել կրկին կամ գրել Telegram-ով։",
    waitUploads: "Սպասեք ֆայլերի վերբեռնման ավարտին։",
    requestNo: "Հարցման համար",
    maxFiles: "Կարելի է կցել առավելագույնը {max} ֆայլ։ {n} ֆայլ չավելացվեց։",
    tooManyUploads: "Չափից շատ վերբեռնումներ։ Փորձեք մեկ րոպե անց։",
    quota: "Օրվա վերբեռնման սահմանաչափը սպառված է։",
    unsupported: "Այս տեսակի ֆայլը չի ընդունվում",
    filesRejected: "Ֆայլերը չհաջողվեց կցել։ Հեռացրեք մի քանիսը և փորձեք կրկին։",
    tooManyRequests: "Չափից շատ հարցումներ։ Փորձեք մեկ րոպե անց։",
    sentKicker: "Հարցումն ուղարկված է",
    willContact: "Կկապվենք Ձեզ հետ ընտրված եղանակով՝ {channel}։",
    copy: "Պատճենել",
    copied: "Պատճենվեց",
  },
  ru: {
    stepOf: "Шаг",
    of: "из",
    chooseSegment: "Выберите один из вариантов",
    needContact: "Пожалуйста, укажите имя и телефон.",
    needConsent: "Нужно ваше согласие.",
    uploadFailed: "Не удалось загрузить",
    tooLarge: "Файл больше 50 МБ",
    remove: "Удалить",
    uploading: "Загрузка…",
    choose: "Выбрать…",
    error: "Не удалось отправить. Попробуйте ещё раз или напишите в Telegram.",
    waitUploads: "Дождитесь окончания загрузки файлов.",
    requestNo: "Номер заявки",
    maxFiles: "Можно приложить не более {max} файлов. Не добавлено: {n}.",
    tooManyUploads: "Слишком много загрузок. Попробуйте через минуту.",
    quota: "Дневной лимит загрузки исчерпан.",
    unsupported: "Такой тип файла не принимается",
    filesRejected: "Не удалось приложить файлы. Удалите часть и попробуйте снова.",
    tooManyRequests: "Слишком много запросов. Попробуйте через минуту.",
    sentKicker: "Заявка отправлена",
    willContact: "Свяжемся с вами выбранным способом: {channel}.",
    copy: "Скопировать",
    copied: "Скопировано",
  },
  en: {
    stepOf: "Step",
    of: "of",
    chooseSegment: "Choose one of the options",
    needContact: "Please enter your name and phone.",
    needConsent: "Your consent is required.",
    uploadFailed: "Upload failed",
    tooLarge: "File is larger than 50 MB",
    remove: "Remove",
    uploading: "Uploading…",
    choose: "Choose…",
    error: "Could not send. Please try again or write us on Telegram.",
    waitUploads: "Please wait until uploads finish.",
    requestNo: "Request number",
    maxFiles: "You can attach up to {max} files. {n} were not added.",
    tooManyUploads: "Too many uploads. Please try again in a minute.",
    quota: "The daily upload limit is used up.",
    unsupported: "This file type is not accepted",
    filesRejected: "The files could not be attached. Remove some and try again.",
    tooManyRequests: "Too many requests. Please try again in a minute.",
    sentKicker: "Request sent",
    willContact: "We will get in touch through the channel you chose: {channel}.",
    copy: "Copy",
    copied: "Copied",
  },
};

const MAX_BYTES = 50 * 1024 * 1024;
/** Files per request — the public upload endpoint accepts this many in one multipart body. */
const MAX_PER_REQUEST = 8;
/** Files on one request — the lead endpoint refuses more, so the wizard never offers more. */
const MAX_TOTAL_FILES = 20;
const ACCEPT = "image/*,.pdf,.dwg,.dxf,.skp,.max,.zip,.rar,.7z,.glb,.usdz,.mp4,.mov";

type UploadedFile = { id: string; name: string; size: number; thumb: string };
type BatchResult = { ok: true; files: UploadedFile[] } | { ok: false; status: number; error: string; name?: string };

/**
 * One request per selection (not per file): the public endpoint accepts eight files at a time and
 * counts requests, not files, in its rate limit — a file-by-file upload runs into a 429 after twenty.
 */
function uploadBatch(files: File[], onProgress: (pct: number) => void): Promise<BatchResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/public");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let r: { ok?: boolean; files?: UploadedFile[]; error?: string; name?: string } = {};
      try {
        r = JSON.parse(xhr.responseText) as typeof r;
      } catch {
        /* a proxy error page, handled as a failure below */
      }
      if (xhr.status < 300 && r.ok && r.files?.length) resolve({ ok: true, files: r.files });
      else resolve({ ok: false, status: xhr.status, error: r.error ?? "failed", name: r.name });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, error: "network" });
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    xhr.send(fd);
  });
}

export function StartWizard({
  locale,
  strings,
  common,
  messageLabel,
  initialSegment,
  utm,
}: {
  locale: Locale;
  strings: StartStrings;
  common: StartCommon;
  /** dict.contact.message — the only string borrowed from the contact block. */
  messageLabel: string;
  initialSegment?: string;
  utm?: Record<string, string>;
}) {
  const s = strings;
  const t = LOCAL[locale];
  const p = (path: string) => localePath(locale, path);
  const uid = useId();

  const [step, setStep] = useState(0);
  const [segment, setSegment] = useState<Segment | null>(initialSegment === "b2b" || initialSegment === "b2c" ? initialSegment : null);
  // project (b2c)
  const [roomType, setRoomType] = useState("kitchen");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [height, setHeight] = useState("");
  const [style, setStyle] = useState("");
  const [appliances, setAppliances] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  // project (b2b)
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [volume, setVolume] = useState("");
  const [service, setService] = useState("kitchenpro");
  const [message, setMessage] = useState("");
  // files
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [filesNotice, setFilesNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // contact
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [email, setEmail] = useState("");
  const [preferredChannel, setPreferredChannel] = useState("phone");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<{ name?: boolean; phone?: boolean }>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const heading = useRef<HTMLHeadingElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const firstSegment = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);

  // A step change replaces the whole panel, so focus would otherwise fall back to <body>: it moves to
  // the heading of the step the visitor just opened. Never on the first render — that would steal focus
  // from the page the visitor is reading.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  // The success view replaces the form; focus and the announcement go to its heading.
  useEffect(() => {
    if (result) successHeading.current?.focus({ preventScroll: true });
  }, [result]);

  const onFormStart = () => {
    if (started.current) return;
    started.current = true;
    trackEvent("form_start", { locale, segment: segment ?? undefined, meta: { form: "start" } });
  };

  const total = s.stepLabels.length;
  const go = (n: number) => {
    setError(null);
    setStep(Math.max(0, Math.min(total - 1, n)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * A failed step: the message is shown (on phones inside the sticky bar, which is the only part of
   * the wizard always on screen) and the control that has to change is focused and scrolled to.
   */
  const fail = (msg: string, el?: HTMLElement | null) => {
    setError(msg);
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      requestAnimationFrame(() => alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
  };

  const next = () => {
    if (step === 0 && !segment) return fail(t.chooseSegment, firstSegment.current);
    go(step + 1);
  };

  const patch = (key: string, u: Partial<Upload>) => setUploads((list) => list.map((x) => (x.key === key ? { ...x, ...u } : x)));

  const uploadMessage = (r: Extract<BatchResult, { ok: false }>) => {
    if (r.status === 429) return r.error === "quota_exceeded" ? t.quota : t.tooManyUploads;
    if (r.error === "too_large") return t.tooLarge;
    if (r.error === "unsupported_type") return t.unsupported;
    return t.uploadFailed;
  };

  /**
   * Sends one selection as a single request. If the server names the file it refused (too large or an
   * unsupported type), that one is marked and the rest are sent again, so one bad file never fails a
   * whole batch.
   */
  const sendChunk = async (chunk: { file: File; key: string }[]) => {
    let pending = chunk;
    for (let round = 0; round < chunk.length && pending.length; round++) {
      const batch = pending;
      const r = await uploadBatch(
        batch.map((x) => x.file),
        (pct) => batch.forEach((x) => patch(x.key, { progress: pct })),
      );
      if (r.ok) {
        // the endpoint answers in the order it was given the files
        batch.forEach((x, i) => {
          const f = r.files[i];
          if (f) patch(x.key, { status: "done", progress: 100, id: f.id, thumb: f.thumb || undefined });
          else patch(x.key, { status: "error", progress: 0, error: t.uploadFailed });
        });
        return;
      }
      const msg = uploadMessage(r);
      const bad = r.name ? batch.find((x) => x.file.name === r.name) : undefined;
      if (bad && batch.length > 1) {
        patch(bad.key, { status: "error", progress: 0, error: msg });
        pending = batch.filter((x) => x !== bad);
        continue;
      }
      batch.forEach((x) => patch(x.key, { status: "error", progress: 0, error: msg }));
      return;
    }
  };

  const addFiles = (picked: FileList | File[]) => {
    onFormStart();
    const incoming = Array.from(picked);
    // the lead endpoint accepts twenty attachments in total, across every batch
    const used = uploads.filter((u) => u.status !== "error").length;
    const room = Math.max(0, MAX_TOTAL_FILES - used);
    const accepted = incoming.slice(0, room);
    const skipped = incoming.length - accepted.length;
    setFilesNotice(skipped > 0 ? t.maxFiles.replace("{max}", String(MAX_TOTAL_FILES)).replace("{n}", String(skipped)) : null);
    if (!accepted.length) return;

    const rows: Upload[] = [];
    const sendable: { file: File; key: string }[] = [];
    for (const file of accepted) {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      const tooBig = file.size > MAX_BYTES;
      rows.push({ key, name: file.name, size: file.size, progress: 0, status: tooBig ? "error" : "uploading", preview, error: tooBig ? t.tooLarge : undefined });
      // an oversized file would make the server refuse the whole batch, so it never leaves the browser
      if (!tooBig) sendable.push({ file, key });
    }
    setUploads((list) => [...list, ...rows]);
    for (let i = 0; i < sendable.length; i += MAX_PER_REQUEST) void sendChunk(sendable.slice(i, i + MAX_PER_REQUEST));
  };

  const removeUpload = (key: string) =>
    setUploads((list) => {
      const it = list.find((x) => x.key === key);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      return list.filter((x) => x.key !== key);
    });

  const submit = async () => {
    if (sending) return;
    if (!name.trim() || !phone.trim()) {
      setInvalid({ name: !name.trim(), phone: !phone.trim() });
      return fail(t.needContact, !name.trim() ? nameRef.current : phoneRef.current);
    }
    setInvalid({});
    if (!consent) return fail(t.needConsent);
    if (uploads.some((u) => u.status === "uploading")) return fail(t.waitUploads);
    setError(null);
    setSending(true);
    const isB2bNow = segment === "b2b";
    const body = {
      segment,
      name,
      phone,
      telegram,
      email,
      preferredChannel,
      language: locale,
      pagePath: window.location.pathname,
      source: "website",
      website,
      companyName: isB2bNow ? companyName : undefined,
      service: isB2bNow ? service : "kitchenpro",
      roomType: isB2bNow ? undefined : roomType,
      budget: isB2bNow ? undefined : budget || undefined,
      message: isB2bNow ? message : undefined,
      details: isB2bNow ? { companyType, volume } : { dims: width || depth || height ? { width, depth, height } : undefined, style, appliances, deadline },
      files: uploads
        .filter((u) => u.status === "done" && u.id)
        .slice(0, MAX_TOTAL_FILES)
        .map((u) => u.id as string),
      utm: utm && Object.keys(utm).length ? utm : undefined,
    };
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; issues?: { path?: string }[] };
      if (res.ok && data.ok) setResult({ code: data.code ?? "" });
      else if (res.status === 429) fail(t.tooManyRequests);
      else if (data.issues?.some((i) => (i.path ?? "").startsWith("files"))) fail(t.filesRejected);
      else if (data.issues?.some((i) => i.path === "name")) {
        setInvalid({ name: true });
        fail(t.needContact, nameRef.current);
      } else fail(t.error);
    } catch {
      fail(t.error);
    } finally {
      setSending(false);
    }
  };

  /* ─────────────────────────── success ─────────────────────────── */
  if (result) {
    const channel = (s.contact.channels as Record<string, string>)[preferredChannel] ?? "";
    const copyCode = () => {
      navigator.clipboard
        ?.writeText(result.code)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    };
    return (
      <div className="mx-auto max-w-2xl" role="status">
        <div className="flex items-center gap-2.5 border-t border-line pt-7">
          <Check size={16} strokeWidth={2.5} className="text-success" aria-hidden />
          <span className="kicker text-success">{t.sentKicker}</span>
        </div>
        <h2 ref={successHeading} tabIndex={-1} className="h-section mt-6 focus:outline-none">
          {s.successTitle}
        </h2>
        <p className="lead mt-5">{s.successText}</p>
        {result.code ? (
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="caption sr-only">{t.requestNo}</span>
            <span className="font-mono text-[2rem] leading-none tracking-[0.06em] text-fg tabular-nums">{result.code}</span>
            <Button type="button" variant="secondary" size="sm" onClick={copyCode} aria-label={`${t.copy} — ${t.requestNo}`}>
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copied ? t.copied : t.copy}
            </Button>
          </div>
        ) : null}
        {channel ? <p className="caption mt-6">{t.willContact.replace("{channel}", channel)}</p> : null}
        <div className="mt-9">
          <Link href={p("/viewer")} className="btn-secondary w-full sm:w-auto">
            {s.successCta}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const isB2b = segment === "b2b";
  const entries = (o: Record<string, string>) => Object.entries(o);

  /* Back / Next controls — rendered twice: inline (desktop) and sticky (mobile). */
  const backBtn =
    step > 0 ? (
      <Button type="button" variant="secondary" onClick={() => go(step - 1)} disabled={sending} className="flex-none">
        <ArrowLeft size={16} />
        {common.back}
      </Button>
    ) : (
      <span className="hidden sm:block" />
    );
  const nextBtn =
    step < total - 1 ? (
      <Button type="button" onClick={next} size="lg" className="flex-1 sm:flex-none">
        {common.next}
        <ArrowRight size={18} />
      </Button>
    ) : (
      <Button type="button" onClick={submit} size="lg" disabled={sending} className="flex-1 sm:flex-none">
        {sending ? <Loader2 size={18} className="animate-spin" /> : null}
        {sending ? common.sending : s.submit}
        {!sending ? <ArrowRight size={18} /> : null}
      </Button>
    );

  return (
    <div className="max-w-2xl pb-32 md:pb-0 lg:max-w-none" onFocusCapture={onFormStart}>
      {/* ── progress: mono counter on a ruler ── */}
      <div className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <span className="index">
            {t.stepOf} {String(step + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="kicker text-fg">{s.stepLabels[step]}</span>
        </div>
        <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {s.stepLabels.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={label} className="min-w-0">
                <div className={cn("h-[3px] transition-colors", done ? "bg-accent" : active ? "bg-fg" : "bg-surface-3")} />
                <div className={cn("mt-2 hidden truncate font-mono text-[10.5px] tracking-[0.1em] uppercase sm:block", active ? "text-fg" : done ? "text-accent" : "text-faint")}>{label}</div>
              </li>
            );
          })}
        </ol>
        <Ticks className="mt-4" />
      </div>

      <div className="border-t border-line pt-7 sm:pt-9">
        {/* ── STEP 1 · who ── */}
        {step === 0 ? (
          <div>
            <h2 ref={heading} tabIndex={-1} className="h-sub focus:outline-none">
              {s.who.title}
            </h2>
            <p className="mt-2 text-[14.5px] text-muted">{s.who.hint}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={s.who.title}>
              {(
                [
                  ["b2c", s.who.b2c],
                  ["b2b", s.who.b2b],
                ] as [Segment, { title: string; text: string }][]
              ).map(([val, card], i) => (
                <label key={val} className="choice flex-col gap-0 p-5 sm:p-6">
                  <input
                    ref={i === 0 ? firstSegment : undefined}
                    type="radio"
                    name="segment"
                    value={val}
                    className="sr-only"
                    checked={segment === val}
                    onChange={() => {
                      setSegment(val);
                      setError(null);
                    }}
                  />
                  <span className="flex w-full items-center justify-between gap-3">
                    <Index n={i + 1} className={cn(segment !== val && "text-faint")} />
                    {/* radio: a ring that fills when chosen — reads as "one of these" before anything is picked */}
                    <span className={cn("relative h-[18px] w-[18px] flex-none rounded-full border-[1.5px] transition-colors", segment === val ? "border-fg" : "border-line-strong")} aria-hidden>
                      <span className={cn("absolute inset-[3px] rounded-full bg-accent transition-transform", segment === val ? "scale-100" : "scale-0")} />
                    </span>
                  </span>
                  <span className="mt-5 block font-display text-[1.25rem] leading-tight text-fg">{card.title}</span>
                  <span className="mt-2 block text-[14.5px] leading-relaxed text-muted">{card.text}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── STEP 2 · project ── */}
        {step === 1 ? (
          <div className="space-y-5">
            <h2 ref={heading} tabIndex={-1} className="h-sub focus:outline-none">
              {s.project.title}
            </h2>
            {isB2b ? (
              <>
                <Field label={s.project.companyName}>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} autoComplete="organization" />
                </Field>
                <div className="grid items-end gap-5 sm:grid-cols-2">
                  <Field label={s.project.companyType}>
                    <Select value={companyType} onChange={(e) => setCompanyType(e.target.value)}>
                      <option value="">{t.choose}</option>
                      {entries(s.project.companyTypes).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={s.project.volume}>
                    <Select value={volume} onChange={(e) => setVolume(e.target.value)}>
                      <option value="">{t.choose}</option>
                      {entries(s.project.volumes).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div>
                  <span className="label" id={`${uid}-service`}>
                    {s.project.service}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby={`${uid}-service`}>
                    {entries(s.project.services).map(([k, v]) => (
                      <label key={k} className="choice items-center gap-3 p-3.5 text-[15px] leading-snug text-fg">
                        <input type="radio" name="service" value={k} className="sr-only" checked={service === k} onChange={() => setService(k)} />
                        <span className={cn("inline-flex h-5 w-5 flex-none items-center justify-center rounded-sm border transition-colors", service === k ? "border-fg bg-accent" : "border-line-strong")} aria-hidden>
                          {service === k ? <Check size={11} strokeWidth={3} className="text-accent-fg" /> : null}
                        </span>
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
                <Field label={messageLabel}>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} />
                </Field>
              </>
            ) : (
              <>
                <div>
                  <span className="label" id={`${uid}-room`}>
                    {s.project.roomType}
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby={`${uid}-room`}>
                    {entries(s.project.rooms).map(([k, v]) => (
                      <label key={k} className="choice items-center gap-2.5 p-3 text-sm leading-snug text-fg">
                        <input type="radio" name="roomType" value={k} className="sr-only" checked={roomType === k} onChange={() => setRoomType(k)} />
                        <span className={cn("inline-flex h-4.5 w-4.5 flex-none items-center justify-center rounded-sm border transition-colors", roomType === k ? "border-fg bg-accent" : "border-line-strong")} aria-hidden>
                          {roomType === k ? <Check size={10} strokeWidth={3} className="text-accent-fg" /> : null}
                        </span>
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="label">{s.project.dims}</span>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {(
                      [
                        [s.project.width, width, setWidth],
                        [s.project.depth, depth, setDepth],
                        [s.project.height, height, setHeight],
                      ] as [string, string, (v: string) => void][]
                    ).map(([label, val, set]) => (
                      <label key={label} className="block">
                        <span className="mb-1 block truncate text-xs text-muted">{label}</span>
                        <Input type="number" inputMode="decimal" min={0} step={0.01} placeholder="0.00" value={val} onChange={(e) => set(e.target.value)} aria-label={label} />
                      </label>
                    ))}
                  </div>
                </div>
                <Field label={s.project.style}>
                  <Textarea value={style} onChange={(e) => setStyle(e.target.value)} placeholder={s.project.stylePlaceholder} maxLength={2000} />
                </Field>
                <Field label={s.project.appliances}>
                  <Input value={appliances} onChange={(e) => setAppliances(e.target.value)} maxLength={500} />
                </Field>
                <div className="grid items-end gap-5 sm:grid-cols-2">
                  <Field label={s.project.budget}>
                    <Select value={budget} onChange={(e) => setBudget(e.target.value)}>
                      <option value="">{t.choose}</option>
                      {entries(s.project.budgets).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={s.project.deadline}>
                    <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} maxLength={120} />
                  </Field>
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* ── STEP 3 · files ── */}
        {step === 2 ? (
          <div>
            <h2 ref={heading} tabIndex={-1} className="h-sub focus:outline-none">
              {s.files.title}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.files.text}</p>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => {
                // Space would otherwise scroll the page while opening the picker
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                fileInput.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "grid-paper mt-7 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-5 py-12 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:py-14",
                dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2 hover:border-fg",
              )}
            >
              <UploadCloud size={26} className="text-muted" aria-hidden />
              <span className="mt-4 block font-display text-[1.2rem] leading-tight text-fg">{s.files.drop}</span>
              <span className="caption mt-2 block">{s.files.hint}</span>
              {/* the surrounding div is the keyboard control; this input is only the file picker */}
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {filesNotice ? (
              <p role="status" className="mt-4 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm text-fg-2">
                {filesNotice}
              </p>
            ) : null}

            {uploads.length ? (
              <ul className="mt-5 space-y-2" aria-live="polite" aria-label={s.files.title}>
                {uploads.map((u) => (
                  <li key={u.key} className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5 pr-2">
                    <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-sm bg-surface-2 text-muted">
                      {u.thumb || u.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.thumb || u.preview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <FileText size={18} aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{u.name}</span>
                      <span className="block font-mono text-[11px] tracking-[0.04em] text-muted tabular-nums">
                        {u.status === "error" ? <span className="text-danger">{u.error ?? t.uploadFailed}</span> : u.status === "uploading" ? `${t.uploading} ${u.progress}%` : formatBytes(u.size)}
                      </span>
                      {u.status === "uploading" ? (
                        <span className="mt-1.5 block h-[3px] overflow-hidden bg-surface-3">
                          <span className="block h-full bg-accent transition-[width]" style={{ width: `${u.progress}%` }} />
                        </span>
                      ) : null}
                    </span>
                    {u.status === "uploading" ? <Loader2 size={16} className="flex-none animate-spin text-faint" aria-hidden /> : u.status === "done" ? <Check size={16} className="flex-none text-success" aria-hidden /> : null}
                    <button type="button" onClick={() => removeUpload(u.key)} className="btn-ghost btn-icon h-10 w-10 flex-none text-faint" aria-label={`${t.remove} — ${u.name}`} title={t.remove}>
                      <X size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* The main way a visitor without files continues — a real button, not an 11 px text link. */}
            <Button type="button" variant="secondary" onClick={() => go(3)} className="mt-6 w-full font-mono text-[11.5px] tracking-[0.08em] uppercase sm:w-auto">
              {s.files.skip}
            </Button>
          </div>
        ) : null}

        {/* ── STEP 4 · contact ── */}
        {step === 3 ? (
          <div className="space-y-5">
            <h2 ref={heading} tabIndex={-1} className="h-sub focus:outline-none">
              {s.contact.title}
            </h2>
            <div className="grid items-end gap-5 sm:grid-cols-2">
              <Field label={s.contact.name} required error={invalid.name ? t.needContact : undefined}>
                <Input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (invalid.name) setInvalid((v) => ({ ...v, name: false }));
                  }}
                  required
                  maxLength={120}
                  autoComplete="name"
                  aria-invalid={invalid.name || undefined}
                />
              </Field>
              <Field label={s.contact.phone} required error={invalid.phone ? t.needContact : undefined}>
                <Input
                  ref={phoneRef}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (invalid.phone) setInvalid((v) => ({ ...v, phone: false }));
                  }}
                  required
                  maxLength={40}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+374"
                  aria-invalid={invalid.phone || undefined}
                />
              </Field>
              <Field label={s.contact.telegram}>
                <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={60} placeholder="@" />
              </Field>
              <Field label={s.contact.email}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
              </Field>
            </div>
            <div>
              <span className="label" id={`${uid}-channel`}>
                {s.contact.channel}
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-labelledby={`${uid}-channel`}>
                {entries(s.contact.channels).map(([k, v]) => (
                  <label key={k} className="choice items-center justify-center gap-2 p-3 text-sm font-medium text-fg">
                    <input type="radio" name="channel" value={k} className="sr-only" checked={preferredChannel === k} onChange={() => setPreferredChannel(k)} />
                    <span className={cn("relative h-4 w-4 flex-none rounded-full border-[1.5px] transition-colors", preferredChannel === k ? "border-fg" : "border-line-strong")} aria-hidden>
                      <span className={cn("absolute inset-[2.5px] rounded-full bg-accent transition-transform", preferredChannel === k ? "scale-100" : "scale-0")} />
                    </span>
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <label className="choice items-start gap-3 text-[15px] leading-snug text-fg-2">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[var(--accent)]" required />
              <span>{s.contact.consent}</span>
            </label>
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
        ) : null}

        {/* Desktop error. On phones the same message sits in the sticky bar, where it cannot fall below
            the fold — `hidden` keeps this copy out of the accessibility tree there. */}
        {error ? (
          <p ref={alertRef} role="alert" className="mt-5 hidden rounded-md border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger md:block">
            {error}
          </p>
        ) : null}

        {/* ── nav (desktop) ── */}
        <div className="mt-8 hidden items-center justify-between gap-3 border-t border-line pt-6 md:flex">
          {backBtn}
          {nextBtn}
        </div>
      </div>

      {/* ── nav (mobile, sticky) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line glass pb-safe md:hidden">
        {error ? (
          <p role="alert" className="border-b border-danger/30 bg-danger-soft px-4 py-2.5 text-[13px] leading-snug text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2 px-4 py-2.5">
          {backBtn}
          {nextBtn}
        </div>
      </div>
    </div>
  );
}
