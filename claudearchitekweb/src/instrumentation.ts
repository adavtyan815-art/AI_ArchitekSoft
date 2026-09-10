/**
 * Runs once when the Next.js server starts.
 * The nested `if` is important: NEXT_RUNTIME is inlined at build time, so the
 * Edge bundle drops the whole block and never tries to bundle native modules.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootNode } = await import("./worker/boot");
    await bootNode();
  }
}
