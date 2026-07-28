import { createHash } from 'crypto';

const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stripHtml(input: string): string {
  return input.replace(SCRIPT_RE, '').replace(HTML_TAG_RE, '').trim();
}

export function sanitizeInput(input: any): any {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    return stripHtml(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item));
  }

  if (typeof input === 'object' && input.constructor === Object) {
    const result: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      result[key] = sanitizeInput(input[key]);
    }
    return result;
  }

  return input;
}

export function validateRequired(fields: string[], body: any): string | null {
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      return `Field "${field}" is required`;
    }
  }
  return null;
}

function textToUuid(text: string): string {
  const hash = createHash('sha256').update(text).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
}

export function convertEmptyToNull(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj.trim() === '' ? null : obj;
  if (Array.isArray(obj)) return obj.map(convertEmptyToNull);
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      let val = convertEmptyToNull(obj[key]);
      if (typeof val === 'string' && val.length > 0 && (key.endsWith('_id') || key === 'id') && !UUID_RE.test(val)) {
        val = textToUuid(val);
      }
      result[key] = val;
    }
    return result;
  }
  return obj;
}
