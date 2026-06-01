import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, getClientIdentifier } from './rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear the rate limit store before each test
    (rateLimit as any).rateLimitStore.clear();
  });

  it('should allow requests within limit', () => {
    const identifier = 'test-ip';
    const result = rateLimit(identifier, { windowMs: 60000, maxRequests: 10 });
    
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('should block requests exceeding limit', () => {
    const identifier = 'test-ip';
    const options = { windowMs: 60000, maxRequests: 2 };
    
    // First request
    rateLimit(identifier, options);
    // Second request
    rateLimit(identifier, options);
    // Third request - should be blocked
    const result = rateLimit(identifier, options);
    
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', () => {
    const identifier = 'test-ip';
    const options = { windowMs: 100, maxRequests: 1 };
    
    // First request
    rateLimit(identifier, options);
    
    // Wait for window to expire
    const startTime = Date.now();
    while (Date.now() - startTime < 110) {
      // Wait
    }
    
    // Second request after window expiry - should be allowed
    const result = rateLimit(identifier, options);
    
    expect(result.success).toBe(true);
  });

  it('should extract client identifier from request headers', () => {
    const request = {
      headers: {
        get: (key: string) => {
          if (key === 'x-forwarded-for') return '192.168.1.1';
          if (key === 'x-real-ip') return '192.168.1.2';
          return null;
        }
      }
    } as any;
    
    const identifier = getClientIdentifier(request);
    expect(identifier).toBe('192.168.1.1');
  });

  it('should fallback to unknown when no IP headers present', () => {
    const request = {
      headers: {
        get: () => null
      }
    } as any;
    
    const identifier = getClientIdentifier(request);
    expect(identifier).toBe('unknown');
  });
});
