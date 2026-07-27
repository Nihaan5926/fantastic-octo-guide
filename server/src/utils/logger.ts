type LogLevel = 'info' | 'warn' | 'error';

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, data?: any): void {
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  if (level === 'error') {
    console.error(line, data !== undefined ? data : '');
  } else if (level === 'warn') {
    console.warn(line, data !== undefined ? data : '');
  } else {
    console.log(line, data !== undefined ? data : '');
  }
}

export const logger = {
  info: (message: string, data?: any) => log('info', message, data),
  warn: (message: string, data?: any) => log('warn', message, data),
  error: (message: string, data?: any) => log('error', message, data),
};
