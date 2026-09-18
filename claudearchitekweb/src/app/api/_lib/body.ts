/**
 * Request-body helpers for the public JSON endpoints: never parse more than a small, fixed number
 * of bytes, and only ever hand a plain object to the route.
 */
export type JsonBody =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413; error: "bad_json" | "too_large" };

/** Reads at most `maxBytes` of the body and parses it; anything that is not a plain JSON object is a 400. */
export async function readJsonObject(req: Request, maxBytes: number): Promise<JsonBody> {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, status: 413, error: "too_large" };

  let text = "";
  try {
    if (!req.body) return { ok: false, status: 400, error: "bad_json" };
    const reader = req.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413, error: "too_large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return { ok: false, status: 400, error: "bad_json" };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, status: 400, error: "bad_json" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, status: 400, error: "bad_json" };
  return { ok: true, value: value as Record<string, unknown> };
}
