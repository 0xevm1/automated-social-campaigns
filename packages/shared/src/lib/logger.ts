import pino from 'pino';
import { CONFIG } from '../config.js';

export function createLogger(correlationId?: string) {
  return pino({
    level: CONFIG.logLevel,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
    ...(correlationId ? { base: { correlationId } } : {}),
  });
}

export const logger = createLogger();
