import { format } from 'node:util';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private level: LogLevel;
  private prefix?: string;

  constructor(level: LogLevel = 'info', prefix?: string) {
    this.level = level;
    this.prefix = prefix;
  }

  child(prefix: string) {
    const combined = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger(this.level, combined);
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;
    const ts = new Date().toISOString();
    const prefix = this.prefix ? ` [${this.prefix}]` : '';
    const line = format(message, ...args);
    const output = `${ts} ${level.toUpperCase()}${prefix} ${line}`;
    if (level === 'error') {
      console.error(output);
      return;
    }
    if (level === 'warn') {
      console.warn(output);
      return;
    }
    console.log(output);
  }
}

export const logger = new Logger((process.env.LOG_LEVEL as LogLevel) || 'info');
