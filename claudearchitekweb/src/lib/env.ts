/**
 * Central, typed access to environment configuration.
 * Every integration is optional: when a key is missing the feature runs in dry-run mode.
 */
import path from "node:path";

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}
function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

/** Built-in development fallbacks and the placeholders shipped in the example env files. None of them is a secret. */
const DEV_SECRET = "dev-secret-change-me-please-32-chars-min";
const DEV_ADMIN_PASSWORD = "architek2026";
const PLACEHOLDER = /^(replace|change[-_ ]?me|your[-_ ]|example|secret$|password$)/i;

/** True when APP_SECRET is the fallback, a shipped placeholder or shorter than 32 characters. */
export function isWeakSecretValue(v: string): boolean {
  return !v || v === DEV_SECRET || PLACEHOLDER.test(v) || v.length < 32;
}

/** True when ADMIN_PASSWORD is unset, the published development default, a placeholder or under 12 characters. */
export function isWeakAdminPasswordValue(v: string | undefined): boolean {
  return !v || v === DEV_ADMIN_PASSWORD || PLACEHOLDER.test(v) || v.length < 12;
}

export const env = {
  get appUrl() {
    return str("APP_URL", "http://localhost:3100").replace(/\/$/, "");
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  /**
   * Server secret. Keys the client-page passcode cookies and salts the visitor / IP hashes stored with
   * analytics and client-page events. Admin sessions do not depend on it (they are random tokens).
   */
  get secret() {
    return str("APP_SECRET", DEV_SECRET);
  },
  /** For Settings → Security and the boot log: the secret is a fallback/placeholder or too short. */
  get isWeakSecret() {
    return isWeakSecretValue(str("APP_SECRET"));
  },
  get databasePath() {
    return path.resolve(process.cwd(), str("DATABASE_PATH", "./data/architeksoft.db"));
  },
  get uploadDir() {
    return path.resolve(process.cwd(), str("UPLOAD_DIR", "./data/uploads"));
  },
  /**
   * Drop-folder the owner copies local files into. Created on boot together with a README, so the
   * feature needs no configuration at all; INBOX_DIR moves it (e.g. to a synced folder or a volume).
   */
  get inboxDir() {
    return path.resolve(process.cwd(), str("INBOX_DIR", "./data/inbox"));
  },
  get runWorkerInApp() {
    return bool("RUN_WORKER_IN_APP", true);
  },
  admin: {
    get email() {
      return str("ADMIN_EMAIL", "admin@architeksoft.com");
    },
    /** Only used once, to create the first owner account (see ensureFirstAdmin). */
    get password() {
      return str("ADMIN_PASSWORD", DEV_ADMIN_PASSWORD);
    },
    /** ADMIN_PASSWORD is missing, the published default, a placeholder or under 12 characters. */
    get isWeakPassword() {
      return isWeakAdminPasswordValue(process.env.ADMIN_PASSWORD);
    },
    get name() {
      return str("ADMIN_NAME", "Admin");
    },
  },
  ai: {
    get anthropicKey() {
      return str("ANTHROPIC_API_KEY");
    },
    get anthropicModel() {
      return str("ANTHROPIC_MODEL", "claude-opus-5");
    },
    get geminiKey() {
      return str("GEMINI_API_KEY");
    },
    get geminiModel() {
      return str("GEMINI_MODEL", "gemini-2.5-flash");
    },
  },
  telegram: {
    get botToken() {
      return str("TELEGRAM_BOT_TOKEN");
    },
    get adminChatId() {
      return str("TELEGRAM_ADMIN_CHAT_ID");
    },
    get channelId() {
      return str("TELEGRAM_CHANNEL_ID");
    },
  },
  meta: {
    get pageId() {
      return str("META_PAGE_ID");
    },
    get pageToken() {
      return str("META_PAGE_ACCESS_TOKEN");
    },
    get igUserId() {
      return str("META_IG_USER_ID");
    },
  },
  linkedin: {
    get token() {
      return str("LINKEDIN_ACCESS_TOKEN");
    },
    get orgUrn() {
      return str("LINKEDIN_ORG_URN");
    },
  },
  youtube: {
    get clientId() {
      return str("YOUTUBE_CLIENT_ID");
    },
    get clientSecret() {
      return str("YOUTUBE_CLIENT_SECRET");
    },
    get refreshToken() {
      return str("YOUTUBE_REFRESH_TOKEN");
    },
  },
  live: {
    get backendUrl() {
      return str("LIVE_BACKEND_URL", "https://live.architeksoft.com").replace(/\/$/, "");
    },
    get username() {
      return str("LIVE_ADMIN_USERNAME");
    },
    get password() {
      return str("LIVE_ADMIN_PASSWORD");
    },
  },
  email: {
    get resendKey() {
      return str("RESEND_API_KEY");
    },
    get from() {
      return str("NOTIFY_EMAIL_FROM", "ArchiTek Soft <no-reply@architeksoft.com>");
    },
    get to() {
      return str("NOTIFY_EMAIL_TO", "architeksoft@gmail.com");
    },
  },
};
