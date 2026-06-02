// Simple in-memory rate limiter for API routes
// For production, consider using Redis or a dedicated rate limiting service

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export function rateLimit(identifier: string, options: RateLimitOptions): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  
  let record = rateLimitStore.get(identifier);
  
  // Clean up expired records
  if (record && record.resetTime < now) {
    rateLimitStore.delete(identifier);
    record = undefined;
  }
  
  if (!record) {
    record = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    rateLimitStore.set(identifier, record);
    return { success: true, remaining: options.maxRequests - 1 };
  }
  
  if (record.count >= options.maxRequests) {
    const remainingTime = Math.ceil((record.resetTime - now) / 1000);
    return { success: false, remaining: 0 };
  }
  
  record.count++;
  return { success: true, remaining: options.maxRequests - record.count };
}

// Attach store to function for testing access
(rateLimit as any).rateLimitStore = rateLimitStore;

// Get client identifier from request
export function getClientIdentifier(request: Request): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return ip;
}

// Rate limit middleware for API routes
export async function withRateLimit(
  request: Request,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 } // Default: 100 requests per minute
): Promise<{ success: boolean; remaining: number }> {
  const identifier = getClientIdentifier(request);
  return rateLimit(identifier, options);
}
