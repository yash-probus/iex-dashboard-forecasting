/**
 * Centralized logging service.
 * Currently uses console, but structured to easily migrate to Winston/Datadog later.
 */

class Logger {
  info(message: string, meta?: any) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  warn(message: string, meta?: any) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  error(message: string, meta?: any) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  success(message: string, meta?: any) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`, meta || '');
  }
}

export const logger = new Logger();
