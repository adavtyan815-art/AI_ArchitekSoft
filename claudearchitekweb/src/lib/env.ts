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

export const env = {
  get appUrl() {
    return str("APP_URL", "http://localhost:3100").replace(/\/$/, "");
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  get secret() {
    return str("APP_SECRET", "dev-secret-change-me-please-32-chars-min");
  },
  get databasePath() {
    return path.resolve(process.cwd(), str("DATABASE_PATH", "./data/architeksoft.db"));
  },
  get uploadDir() {
    return path.resolve(process.cwd(), str("UPLOAD_DIR", "./data/uploads"));
  },
  get runWorkerInApp() {
    return bool("RUN_WORKER_IN_APP", true);
  },
  admin: {
    get email() {
      return str("ADMIN_EMAIL", "admin@architeksoft.com");
    },
    get password() {
      return str("ADMIN_PASSWORD", "architek2026");
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
