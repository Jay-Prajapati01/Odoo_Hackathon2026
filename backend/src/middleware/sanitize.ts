import { Request, Response, NextFunction } from 'express';

const BLOCKED_KEYS = ['__proto__', 'constructor', 'prototype'];
const PROTOTYPE_KEYS = new Set(BLOCKED_KEYS);

/**
 * Recursively removes keys that enable NoSQL operator injection (leading `$`)
 * and prototype pollution (`__proto__`, `constructor`, `prototype`) from a
 * plain object. Values are left untouched so legitimate strings (emails, etc.)
 * are preserved.
 */
function sanitizeObject(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item));
  }
  if (input && typeof input === 'object' && input.constructor === Object) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (PROTOTYPE_KEYS.has(key) || key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleaned[key] = sanitizeObject(value);
    }
    return cleaned;
  }
  return input;
}

/**
 * Defense-in-depth middleware that strips dangerous keys from request body,
 * query and params before they reach controllers. Helmet, validation and
 * Mongoose parameterized queries provide additional layers of protection.
 */
export function sanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body) as Record<string, unknown>;
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as typeof req.query;
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params) as typeof req.params;
  }
  next();
}
