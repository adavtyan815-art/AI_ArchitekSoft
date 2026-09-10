"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Check, FileText, Home, Loader2, UploadCloud, X } from "lucide-react";
import { localePath, type Dictionary, type Locale } from "@/lib/i18n";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { trackEvent } from "@/components/site/track";
import { cn, formatBytes } from "@/lib/utils";

type Segment = "b2c" | "b2b";
type Upload = { key: string; name: string; size: number; progress: number; status: "uploading" | "done" | "error"; id?: string; thumb?: string; preview?: string };

/** Only what the wizard renders — the whole dictionary never reaches the client. */
export type StartStrings = Dictionary["start"];
export type StartCommon = Pick<Dictionary["common"], "back" | "next" | "sending">;

/** Strings that are not in the shared dictionaries (wizard-only helper text). */
type Local = { stepOf: string; of: string; chooseSegment: string; needContact: string; needConsent: string; uploadFailed: string; tooLarge: string; remove: string; uploading: string; choose: string; error: string; waitUploads: string; requestNo: string };
const LOCAL: Record<Locale, Local> = {
  hy: { stepOf: "Քայլ", of: "/", chooseSegment: "Ընտրեք տարբերակներից մեկը", needContact: "Խնդրում ենք լրացնել անունն ու հեռախոսը։", needConsent: "Անհրաժեշտ է Ձեր համաձայնությունը։", uploadFailed: "Չհաջողվեց վերբեռնել", tooLarge: "Ֆայլը մեծ է 50 ՄԲ-ից", remove: "Հեռացնել", uploading: "Վերբեռնվում է…", choose: "Ընտրել…", error: "Չհաջողվեց ուղարկել։ Խնդրում ենք փորձել կրկին կամ գրել Telegram-ով։", waitUploads: "Սպասեք ֆայլերի վերբեռնման ավարտին։", requestNo: "Հարցման համար" },
  ru: { stepOf: "Шаг", of: "из", chooseSegment: "Выберите один из вариантов", needContact: "Пожалуйста, укажите имя и телефон.", needConsent: "Нужно ваше согласие.", uploadFailed: "Не удалось загрузить", tooLarge: "Файл больше 50 МБ", remove: "Удалить", uploading: "Загрузка…", choose: "Выбрать…", error: "Не удалось отправить. Попробуйте ещё раз или напишите в Telegram.", waitUploads: "Дождитесь окончания загрузки файлов.", requestNo: "Номер заявки" },
  en: { stepOf: "Step", of: "of", chooseSegment: "Choose one of the options", needContact: "Please enter your name and phone.", needConsent: "Your consent is required.", uploadFailed: "Upload failed", tooLarge: "File is larger than 50 MB", remove: "Remove", uploading: "Uploading…", choose: "Choose…", error: "Could not send. Please try again or write us on Telegram.", waitUploads: "Please wait until uploads finish.", requestNo: "Request number" },
};

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = "image/*,.pdf,.dwg,.dxf,.skp,.max,.zip,.rar,.7z,.glb,.usdz,.mp4,.mov";

function uploadFile(file: File, onProgress: (pct: number) => void): Promise<{ id: string; name: string; size: number; thumb: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/public");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const r = JSON.parse(xhr.responseText) as { ok?: boolean; files?: { id: string; name: string; size: number; thumb: string }[]; error?: string };
        if (xhr.status < 300 && r.ok && r.files?.[0]) resolve(r.files[0]);
        else reject(new Error(r.error || `HTTP ${xhr.status}`));
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    const fd = new FormData();
    fd.append("files", file);
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
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ code: string } | null>(null);
  const started = useRef(false);

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

  const next = () => {
    if (step === 0 && !segment) return setError(t.chooseSegment);
    go(step + 1);
  };

  const patch = (key: string, u: Partial<Upload>) => setUploads((list) => list.map((x) => (x.key === key ? { ...x, ...u } : x)));

  const addFiles = (files: FileList | File[]) => {
    onFormStart();
    const arr = Array.from(files).slice(0, 8);
    for (const file of arr) {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      const item: Upload = { key, name: file.name, size: file.size, progress: 0, status: "uploading", preview };
      setUploads((list) => [...list, item]);
      if (file.size > MAX_BYTES) {
        patch(key, { status: "error", progress: 0 });
        continue;
      }
      uploadFile(file, (pct) => patch(key, { progress: pct }))
        .then((r) => patch(key, { status: "done", progress: 100, id: r.id, thumb: r.thumb || undefined }))
        .catch(() => patch(key, { status: "error" }));
    }
  };

  const removeUpload = (key: string) =>
    setUploads((list) => {
      const it = list.find((x) => x.key === key);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      return list.filter((x) => x.key !== key);
    });

  const submit = async () => {
    if (sending) return;
    if (!name.trim() || !phone.trim()) return setError(t.needContact);
    if (!consent) return setError(t.needConsent);
    if (uploads.some((u) => u.status === "uploading")) return setError(t.waitUploads);
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
      files: uploads.filter((u) => u.status === "done" && u.id).map((u) => u.id as string),
      utm: utm && Object.keys(utm).length ? utm : undefined,
    };
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string };
      if (res.ok && data.ok) setResult({ code: data.code ?? "" });
      else setError(t.error);
    } catch {
      setError(t.error);
    } finally {
      setSending(false);
    }
  };

  /* ─────────────────────────── success ─────────────────────────── */
  if (result) {
    return (
      <div className="card mx-auto max-w-xl p-7 text-center sm:p-10">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Check size={28} strokeWidth={3} />
        </span>
        <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-fg">{s.successTitle}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{s.successText}</p>
        {result.code ? (
          <div className="card-inset mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm">
            <span className="text-muted">{t.requestNo}</span>
            <span className="font-mono font-semibold text-fg">{result.code}</span>
          </div>
        ) : null}
        <div className="mt-8">
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
    <div className="mx-auto max-w-2xl pb-24 md:pb-0" onFocusCapture={onFormStart}>
      {/* ── segmented progress ── */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="kicker">
            {t.stepOf} {step + 1} {t.of} {total}
          </span>
          <span className="text-[13px] font-semibold text-fg sm:hidden">{s.stepLabels[step]}</span>
        </div>
        <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {s.stepLabels.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={label} className="min-w-0">
                <div className={cn("h-1.5 rounded-full transition-colors", done ? "bg-accent" : active ? "bg-fg" : "bg-surface-3")} />
                <div className={cn("mt-2 hidden truncate text-xs font-semibold sm:block", active ? "text-fg" : done ? "text-accent" : "text-faint")}>{label}</div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="card p-5 sm:p-8">
        {/* ── STEP 1 · who ── */}
        {step === 0 ? (
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg">{s.who.title}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["b2c", s.who.b2c, Home],
                  ["b2b", s.who.b2b, Building2],
                ] as [Segment, { title: string; text: string }, typeof Home][]
              ).map(([val, card, Icon]) => (
                <label key={val} className="choice flex-col gap-0 p-5">
                  <input
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
                  <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors", segment === val ? "bg-accent text-accent-fg" : "bg-accent-soft text-accent-soft-fg")}>
                    <Icon size={20} />
                  </span>
                  <span className="mt-4 block h-card">{card.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{card.text}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── STEP 2 · project ── */}
        {step === 1 ? (
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg">{s.project.title}</h2>
            {isB2b ? (
              <>
                <Field label={s.project.companyName}>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} autoComplete="organization" />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
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
                  <span className="label">{s.project.service}</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {entries(s.project.services).map(([k, v]) => (
                      <label key={k} className="choice items-center gap-3 p-3.5 text-[15px] leading-snug text-fg">
                        <input type="radio" name="service" value={k} className="sr-only" checked={service === k} onChange={() => setService(k)} />
                        <span className={cn("inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border transition-colors", service === k ? "border-accent bg-accent" : "border-line-strong")}>
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
                  <span className="label">{s.project.roomType}</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {entries(s.project.rooms).map(([k, v]) => (
                      <label key={k} className="choice items-center gap-2.5 p-3 text-sm leading-snug text-fg">
                        <input type="radio" name="roomType" value={k} className="sr-only" checked={roomType === k} onChange={() => setRoomType(k)} />
                        <span className={cn("inline-flex h-4.5 w-4.5 flex-none items-center justify-center rounded-full border transition-colors", roomType === k ? "border-accent bg-accent" : "border-line-strong")}>
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
                <div className="grid gap-5 sm:grid-cols-2">
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
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg">{s.files.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.files.text}</p>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
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
                "mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:py-12",
                dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2 hover:border-accent",
              )}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-fg">
                <UploadCloud size={22} />
              </span>
              <span className="mt-4 block h-card">{s.files.drop}</span>
              <span className="mt-1 block text-sm text-muted">{s.files.hint}</span>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {uploads.length ? (
              <ul className="mt-5 space-y-2">
                {uploads.map((u) => (
                  <li key={u.key} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 pr-2">
                    <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg bg-surface-2 text-muted">
                      {u.thumb || u.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.thumb || u.preview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <FileText size={18} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{u.name}</span>
                      <span className="block text-xs text-muted">
                        {u.status === "error" ? <span className="text-danger">{u.size > MAX_BYTES ? t.tooLarge : t.uploadFailed}</span> : u.status === "uploading" ? `${t.uploading} ${u.progress}%` : formatBytes(u.size)}
                      </span>
                      {u.status === "uploading" ? (
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-3">
                          <span className="block h-full bg-accent transition-[width]" style={{ width: `${u.progress}%` }} />
                        </span>
                      ) : null}
                    </span>
                    {u.status === "uploading" ? <Loader2 size={16} className="flex-none animate-spin text-faint" /> : u.status === "done" ? <Check size={16} className="flex-none text-success" /> : null}
                    <button type="button" onClick={() => removeUpload(u.key)} className="btn-ghost btn-icon h-10 w-10 flex-none text-faint" aria-label={t.remove} title={t.remove}>
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <button type="button" onClick={() => go(3)} className="mt-5 text-sm font-semibold text-muted underline-offset-4 hover:text-fg hover:underline">
              {s.files.skip}
            </button>
          </div>
        ) : null}

        {/* ── STEP 4 · contact ── */}
        {step === 3 ? (
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg">{s.contact.title}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={s.contact.name} required>
                <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" />
              </Field>
              <Field label={s.contact.phone} required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={40} autoComplete="tel" inputMode="tel" placeholder="+374" />
              </Field>
              <Field label={s.contact.telegram}>
                <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={60} placeholder="@" />
              </Field>
              <Field label={s.contact.email}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
              </Field>
            </div>
            <div>
              <span className="label">{s.contact.channel}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {entries(s.contact.channels).map(([k, v]) => (
                  <label key={k} className="choice items-center justify-center gap-2 p-3 text-sm font-medium text-fg">
                    <input type="radio" name="channel" value={k} className="sr-only" checked={preferredChannel === k} onChange={() => setPreferredChannel(k)} />
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

        {error ? (
          <p role="alert" className="mt-5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
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
        <div className="flex items-center gap-2 px-4 py-2.5">
          {backBtn}
          {nextBtn}
        </div>
      </div>
    </div>
  );
}
