type LogData = Record<string, unknown>;

class Logger {
  error(description: string, err: unknown, data: LogData = {}) {
    console.error(description, err, data);
  }

  warn(description: string, data: LogData = {}) {
    console.warn(description, data);
  }
}

export const logger = new Logger();
