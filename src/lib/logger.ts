// Comprehensive logging system for TableScan
// Logs to console in development, can be extended to send to external services in production

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  restaurantId?: string;
  requestId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, userId, restaurantId, requestId } = entry;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const metaStr = [userId, restaurantId, requestId].filter(Boolean).join(' | ');
    const metaStrFormatted = metaStr ? ` | ${metaStr}` : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}${metaStrFormatted}`;
  }

  private log(entry: LogEntry) {
    const formatted = this.formatLog(entry);

    if (this.isDevelopment) {
      // Color-coded console output in development
      const colors = {
        info: '\x1b[36m', // cyan
        warn: '\x1b[33m', // yellow
        error: '\x1b[31m', // red
        debug: '\x1b[35m', // magenta
      };
      const reset = '\x1b[0m';
      
      console.log(`${colors[entry.level]}${formatted}${reset}`);
    } else {
      // In production, send to external logging service (Sentry, Datadog, etc.)
      console.log(formatted);
      // TODO: Integrate with external logging service
    }
  }

  info(message: string, context?: Record<string, any>, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.log({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context,
      ...meta,
    });
  }

  warn(message: string, context?: Record<string, any>, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.log({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context,
      ...meta,
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.log({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : undefined,
      },
      ...meta,
    });
  }

  debug(message: string, context?: Record<string, any>, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    if (this.isDevelopment) {
      this.log({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        context,
        ...meta,
      });
    }
  }

  // API-specific logging helpers
  apiRequest(method: string, path: string, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.info(`API Request: ${method} ${path}`, undefined, meta);
  }

  apiResponse(method: string, path: string, statusCode: number, duration: number, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.info(`API Response: ${method} ${path} - ${statusCode} (${duration}ms)`, undefined, meta);
  }

  apiError(method: string, path: string, error: Error, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.error(`API Error: ${method} ${path}`, error, undefined, meta);
  }

  // Database operation logging
  dbQuery(operation: string, table: string, duration?: number, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.debug(`DB Query: ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`, undefined, meta);
  }

  dbError(operation: string, table: string, error: Error, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.error(`DB Error: ${operation} on ${table}`, error, undefined, meta);
  }

  // Business event logging
  orderCreated(orderId: string, orderNumber: string, restaurantId: string, meta?: { userId?: string; requestId?: string }) {
    this.info(`Order Created: ${orderNumber} (${orderId})`, { orderId, orderNumber }, { restaurantId, ...meta });
  }

  orderUpdated(orderId: string, oldStatus: string, newStatus: string, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.info(`Order Updated: ${orderId} - ${oldStatus} → ${newStatus}`, { orderId, oldStatus, newStatus }, meta);
  }

  paymentProcessed(paymentId: string, amount: number, method: string, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.info(`Payment Processed: ${paymentId} - ₹${amount} (${method})`, { paymentId, amount, method }, meta);
  }

  kdsStageUpdated(orderId: string, stage: string, meta?: { userId?: string; restaurantId?: string; requestId?: string }) {
    this.info(`KDS Stage Updated: ${orderId} - ${stage}`, { orderId, stage }, meta);
  }
}

export const logger = new Logger();

// Helper to generate request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
