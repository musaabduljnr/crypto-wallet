/**
 * Structured JSON Logger with automated PII & Secret Scrubbing.
 * Ensures passwords, authorization headers, private keys, and bank credentials
 * are never written to standard output or logging aggregators.
 */

const REDACTED_KEYS = new Set([
  'password',
  'passwordconfirm',
  'newpassword',
  'oldpassword',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'servicerolekey',
  'authorization',
  'privatekey',
  'seedphrase',
  'bvn',
  'nin',
  'cardnumber',
  'cvv',
]);

function sanitizeValue(key: string, value: unknown): unknown {
  const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
  if (REDACTED_KEYS.has(normalizedKey)) {
    return '[REDACTED]';
  }

  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(key, item));
    }
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitizedObj[k] = sanitizeValue(k, v);
    }
    return sanitizedObj;
  }

  return value;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context: context ? sanitizeValue('context', context) : undefined,
    };
    console.log(JSON.stringify(payload));
  },

  warn(message: string, context?: Record<string, unknown>) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context: context ? sanitizeValue('context', context) : undefined,
    };
    console.warn(JSON.stringify(payload));
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const errObj =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;

    const payload = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: errObj ? sanitizeValue('error', errObj) : undefined,
      context: context ? sanitizeValue('context', context) : undefined,
    };
    console.error(JSON.stringify(payload));
  },
};
