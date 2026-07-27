const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

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
