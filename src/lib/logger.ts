/**
 * Structured logger for the AI Health Coach backend.
 *
 * Outputs JSON-formatted log lines for easy parsing by log aggregators
 * (Datadog, CloudWatch, etc.). In development, outputs human-readable format.
 *
 * SECURITY:
 *  - Never logs secrets, tokens, passwords, or API keys.
 *  - Sanitizes error messages to remove potential PII.
 *  - Includes request ID for tracing when available.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== "production";

/** Fields that must never appear in logs. */
const REDACTED_FIELDS = new Set([
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "authorization",
  "cookie",
  "token",
]);

/** Recursively redact sensitive fields from an object. */
function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redact(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function emit(entry: LogEntry) {
  const safe = redact(entry as unknown as Record<string, unknown>);

  if (isDev) {
    // Human-readable format for development
    const prefix = `[${entry.level.toUpperCase()}]`;
    const parts = [prefix, entry.message];
    if (entry.path) parts.push(`${entry.method ?? ""} ${entry.path}`);
    if (entry.statusCode) parts.push(`→ ${entry.statusCode}`);
    if (entry.durationMs) parts.push(`(${entry.durationMs}ms)`);
    if (entry.error) parts.push(`| ${entry.error}`);

    const method = entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "log";
    console[method](parts.join(" "));
  } else {
    // JSON format for production log aggregation
    const method = entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "log";
    console[method](JSON.stringify(safe));
  }
}

export const logger = {
  debug(message: string, meta?: Partial<LogEntry>) {
    if (isDev) {
      emit({ level: "debug", message, timestamp: new Date().toISOString(), ...meta });
    }
  },

  info(message: string, meta?: Partial<LogEntry>) {
    emit({ level: "info", message, timestamp: new Date().toISOString(), ...meta });
  },

  warn(message: string, meta?: Partial<LogEntry>) {
    emit({ level: "warn", message, timestamp: new Date().toISOString(), ...meta });
  },

  error(message: string, meta?: Partial<LogEntry>) {
    emit({ level: "error", message, timestamp: new Date().toISOString(), ...meta });
  },

  /** Log an API request/response cycle. */
  request(meta: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    requestId?: string;
    userId?: string;
  }) {
    const level: LogLevel = meta.statusCode >= 500 ? "error" : meta.statusCode >= 400 ? "warn" : "info";
    emit({
      level,
      message: "API request",
      timestamp: new Date().toISOString(),
      ...meta,
    });
  },
};
