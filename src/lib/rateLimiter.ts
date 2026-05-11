/**
 * Client-side rate limiting for login attempts
 * Provides defense-in-depth alongside backend API rate limiting
 */

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

// In-memory store for login attempts (persists during session)
const loginAttempts = new Map<string, LoginAttempt>();

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout after max attempts

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until next attempt allowed
  attemptsRemaining?: number;
}

/**
 * Check if a login attempt is allowed based on previous attempts
 * @param identifier - Email or other unique identifier
 * @returns Whether the attempt is allowed and retry info
 */
export function checkLoginRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const key = identifier.toLowerCase().trim();
  const attempts = loginAttempts.get(key);

  // No previous attempts - allow
  if (!attempts) {
    loginAttempts.set(key, { count: 1, firstAttempt: now, lastAttempt: now });
    return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  // Check if window has expired - reset counter
  if (now - attempts.firstAttempt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now, lastAttempt: now });
    return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  // Check if max attempts reached
  if (attempts.count >= MAX_ATTEMPTS) {
    const lockoutEnd = attempts.firstAttempt + LOCKOUT_MS;
    const retryAfter = Math.ceil((lockoutEnd - now) / 1000);
    
    if (retryAfter > 0) {
      return { allowed: false, retryAfter };
    }
    
    // Lockout expired - reset
    loginAttempts.set(key, { count: 1, firstAttempt: now, lastAttempt: now });
    return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  // Allow and increment counter
  attempts.count++;
  attempts.lastAttempt = now;
  return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - attempts.count };
}

/**
 * Record a failed login attempt
 * @param identifier - Email or other unique identifier
 */
export function recordFailedLogin(identifier: string): void {
  const key = identifier.toLowerCase().trim();
  const attempts = loginAttempts.get(key);
  
  if (attempts) {
    attempts.count++;
    attempts.lastAttempt = Date.now();
  } else {
    loginAttempts.set(key, { 
      count: 1, 
      firstAttempt: Date.now(), 
      lastAttempt: Date.now() 
    });
  }
}

/**
 * Clear login attempts for an identifier (call after successful login)
 * @param identifier - Email or other unique identifier
 */
export function clearLoginAttempts(identifier: string): void {
  const key = identifier.toLowerCase().trim();
  loginAttempts.delete(key);
}

/**
 * Get progressive delay based on attempt count (exponential backoff)
 * @param attemptCount - Number of failed attempts
 * @returns Delay in milliseconds
 */
export function getProgressiveDelay(attemptCount: number): number {
  if (attemptCount <= 1) return 0;
  // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
  return Math.min(1000 * Math.pow(2, attemptCount - 2), 15000);
}

/**
 * Format retry time for display
 * @param seconds - Seconds to wait
 * @returns Formatted string in Spanish
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundos`;
  }
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}
