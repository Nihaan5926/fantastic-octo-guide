export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getClassificationColor(level: string): string {
  const map: Record<string, string> = {
    UNCLASSIFIED: 'text-classification-unclassified',
    CONFIDENTIAL: 'text-classification-confidential',
    SECRET: 'text-classification-secret',
    TOP_SECRET: 'text-classification-top_secret',
  };
  return map[level] || 'text-text-muted';
}

export function getClassificationBg(level: string): string {
  const map: Record<string, string> = {
    UNCLASSIFIED: 'bg-classification-unclassified/20',
    CONFIDENTIAL: 'bg-classification-confidential/20',
    SECRET: 'bg-classification-secret/20',
    TOP_SECRET: 'bg-classification-top_secret/20',
  };
  return map[level] || 'bg-bg-tertiary';
}
