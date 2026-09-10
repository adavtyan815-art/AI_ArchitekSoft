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

export function StartWizard({ locale, dict, initialSegment, utm }: { locale: Locale; dict: Dictionary; initialSegment?: string; utm?: Record<string, string> }) {
  const s = dict.start;
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
    const isB2b = segment === "b2b";
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
      companyName: isB2b ? companyName : undefined,
      service: isB2b ? service : "kitchenpro",
      roomType: isB2b ? undefined : roomType,
      budget: isB2b ? undefined : budget || undefined,
      message: isB2b ? message : undefined,
      details: isB2b
        ? { companyType, volume }
        : { dims: width || depth || height ? { width, depth, height } : undefined, style, appliances, deadline },
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

  /* ---------- success ---------- */
  if (result) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center sm:p-10">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white">
          <Check size={26} strokeWidth={3} />
        </span>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight text-ink-950">{s.successTitle}</h2>
        <p className="mt-4 text-ink-600">{s.successText}</p>
        {result.code ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-paper-2 px-4 py-2 text-sm">
            <span className="text-ink-500">{t.requestNo}</span>
            <span className="font-mono font-semibold text-ink-950">{result.code}</span>
          </div>
        ) : null}
        <div className="mt-8">
          <Link href={p("/portfolio")} className="btn-secondary">
            {s.successCta}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const isB2b = segment === "b2b";
  const entries = (o: Record<string, string>) => Object.entries(o);

  return (
    <div className="mx-auto max-w-2xl" onFocusCapture={onFormStart}>
      {/* progress */}
      <ol className="mb-8 grid grid-cols-4 gap-2">
        {s.stepLabels.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="min-w-0">
              <div className={cn("h-1 rounded-full", done || active ? "bg-brand-500" : "bg-ink-200")} />
              <div className={cn("mt-2 truncate text-xs font-semibold", active ? "text-ink-950" : done ? "text-brand-600" : "text-ink-400")}>
                <span className="sm:hidden">{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {t.stepOf} {step + 1} {t.of} {total}
      </div>

      <div className="card p-6 sm:p-8">
        {/* STEP 1: who */}
        {step === 0 ? (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950">{s.who.title}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["b2c", s.who.b2c, Home],
                  ["b2b", s.who.b2b, Building2],
                ] as [Segment, { title: string; text: string }, typeof Home][]
              ).map(([val, card, Icon]) => {
                const on = segment === val;
                return (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setSegment(val);
                      setError(null);
                    }}
                    className={cn("rounded-2xl border p-5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400", on ? "border-ink-950 bg-ink-950 text-white" : "border-ink-200 bg-white hover:border-ink-300")}
                  >
                    <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full", on ? "bg-white/10 text-brand-300" : "bg-brand-50 text-brand-600")}>
                      <Icon size={18} />
                    </span>
                    <div className="mt-4 text-base font-semibold">{card.title}</div>
                    <div className={cn("mt-1 text-sm", on ? "text-ink-300" : "text-ink-500")}>{card.text}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* STEP 2: project */}
        {step === 1 ? (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950">{s.project.title}</h2>
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
                <Field label={s.project.service}>
                  <Select value={service} onChange={(e) => setService(e.target.value)}>
                    {entries(s.project.services).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={dict.contact.message}>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} />
                </Field>
              </>
            ) : (
              <>
                <Field label={s.project.roomType}>
                  <Select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                    {entries(s.project.rooms).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div>
                  <span className="label">{s.project.dims}</span>
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        [s.project.width, width, setWidth],
                        [s.project.depth, depth, setDepth],
                        [s.project.height, height, setHeight],
                      ] as [string, string, (v: string) => void][]
                    ).map(([label, val, set]) => (
                      <label key={label} className="block">
                        <Input type="number" inputMode="decimal" min={0} step={0.01} placeholder={label} value={val} onChange={(e) => set(e.target.value)} aria-label={label} />
                        <span className="mt-1 block truncate text-xs text-ink-400">{label}</span>
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

        {/* STEP 3: files */}
        {step === 2 ? (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950">{s.files.title}</h2>
            <p className="mt-2 text-ink-600">{s.files.text}</p>
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
              className={cn("mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400", dragging ? "border-brand-400 bg-brand-50" : "border-ink-200 bg-paper-2 hover:border-ink-300")}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-soft">
                <UploadCloud size={22} />
              </span>
              <div className="mt-4 text-base font-semibold text-ink-950">{s.files.drop}</div>
              <div className="mt-1 text-sm text-ink-500">{s.files.hint}</div>
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
                  <li key={u.key} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5 pr-3">
                    <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg bg-ink-100 text-ink-500">
                      {u.thumb || u.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.thumb || u.preview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <FileText size={18} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">{u.name}</span>
                      <span className="block text-xs text-ink-500">
                        {u.status === "error" ? <span className="text-danger-500">{u.size > MAX_BYTES ? t.tooLarge : t.uploadFailed}</span> : u.status === "uploading" ? `${t.uploading} ${u.progress}%` : formatBytes(u.size)}
                      </span>
                      {u.status === "uploading" ? (
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-ink-100">
                          <span className="block h-full bg-brand-500 transition-[width]" style={{ width: `${u.progress}%` }} />
                        </span>
                      ) : null}
                    </span>
                    {u.status === "uploading" ? <Loader2 size={16} className="flex-none animate-spin text-ink-400" /> : u.status === "done" ? <Check size={16} className="flex-none text-brand-600" /> : null}
                    <button type="button" onClick={() => removeUpload(u.key)} className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-900" aria-label={t.remove} title={t.remove}>
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <button type="button" onClick={() => go(3)} className="mt-5 text-sm font-semibold text-ink-500 underline-offset-4 hover:text-ink-900 hover:underline">
              {s.files.skip}
            </button>
          </div>
        ) : null}

        {/* STEP 4: contact */}
        {step === 3 ? (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950">{s.contact.title}</h2>
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
            <Field label={s.contact.channel}>
              <Select value={preferredChannel} onChange={(e) => setPreferredChannel(e.target.value)}>
                {entries(s.contact.channels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none rounded border-ink-300 text-brand-500 focus:ring-brand-400" required />
              <span>{s.contact.consent}</span>
            </label>
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-5 text-sm text-danger-500">{error}</p> : null}

        {/* nav */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={sending}>
              <ArrowLeft size={16} />
              {dict.common.back}
            </Button>
          ) : (
            <span />
          )}
          {step < total - 1 ? (
            <Button type="button" onClick={next} size="lg">
              {dict.common.next}
              <ArrowRight size={18} />
            </Button>
          ) : (
            <Button type="button" onClick={submit} size="lg" disabled={sending}>
              {sending ? <Loader2 size={18} className="animate-spin" /> : null}
              {sending ? dict.common.sending : s.submit}
              {!sending ? <ArrowRight size={18} /> : null}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
