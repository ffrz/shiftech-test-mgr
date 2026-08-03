import { inspect } from 'node:util';

export const REDACTED = '[REDACTED]';

const secrets = new Set<string>();
const SENSITIVE_NAME = /(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|CREDENTIAL|AUTHORIZATION|COOKIE|BOOTSTRAP(?:_CODE)?)/i;
const URL_CREDENTIALS = /(https?:\/\/)([^\s/@:]+):([^\s/@]+)@/gi;
const AUTH_VALUE = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;

export function registerSecret(value: string | null | undefined): void {
  if (value && value.length >= 4) secrets.add(value);
}

export function registerEnvironmentSecrets(env: NodeJS.ProcessEnv = process.env): void {
  for (const [name, value] of Object.entries(env)) {
    if (SENSITIVE_NAME.test(name)) registerSecret(value);
  }
}

export function redactSecrets(value: string): string {
  let redacted = value.replace(URL_CREDENTIALS, `$1${REDACTED}@`).replace(AUTH_VALUE, REDACTED);
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    redacted = redacted.split(secret).join(REDACTED);
    const encoded = Buffer.from(secret, 'utf8').toString('base64');
    if (encoded.length >= 4) redacted = redacted.split(encoded).join(REDACTED);
  }
  return redacted;
}

export function redactValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return redactSecrets(value);
  if (value instanceof Error) {
    return { name: value.name, message: redactSecrets(value.message), stack: redactSecrets(value.stack ?? '') };
  }
  if (Array.isArray(value)) return value.map((item) => redactValue(item, seen));
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_NAME.test(key) ? REDACTED : redactValue(item, seen),
    ]));
  }
  return value;
}

export class SecretRedactorStream {
  private pending = '';

  write(chunk: string): string {
    this.pending += chunk;
    const longest = Math.max(0, ...[...secrets].flatMap((secret) => [secret.length, Buffer.from(secret).toString('base64').length]));
    if (!longest) { const output = redactSecrets(this.pending); this.pending = ''; return output; }
    const safeLength = Math.max(0, this.pending.length - longest + 1);
    if (!safeLength) return '';
    const output = redactSecrets(this.pending.slice(0, safeLength));
    this.pending = this.pending.slice(safeLength);
    return output;
  }

  flush(): string { const output = redactSecrets(this.pending); this.pending = ''; return output; }
}

export type LogLevel = 'info' | 'warn' | 'error';
export type LogWriter = (line: string, level: LogLevel) => void;
export interface AgentLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export function createLogger(component: string, writer?: LogWriter): AgentLogger {
  const emit = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    const safeMeta = meta && Object.keys(meta).length ? ` ${JSON.stringify(redactValue(meta))}` : '';
    const line = `${new Date().toISOString()} [${level.toUpperCase()}] [${component}] ${redactSecrets(message)}${safeMeta}`;
    if (writer) writer(line, level);
    else (level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
  };
  return {
    info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
  };
}

export function formatCrash(error: unknown): Record<string, unknown> {
  return { error: error instanceof Error ? error : inspect(error, { depth: 4 }) };
}

/** Installs the final synchronous redaction boundary for otherwise unhandled crashes. */
export function installCrashHandlers(logger: AgentLogger, exit: (code: number) => never = process.exit): void {
  const crash = (error: unknown): void => {
    logger.error('Unhandled fatal error', formatCrash(error));
    exit(1);
  };
  process.once('uncaughtException', crash);
  process.once('unhandledRejection', crash);
}
