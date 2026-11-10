import rateLimit from "express-rate-limit";

/* =====================================================================
 * Security middleware — rate limiting + brute-force account lockout
 * ====================================================================*/

/* ---- JSON error handler shared by all limiters ---- */
const limiterHandler = (req, res) => {
  const waitMin = Math.ceil((req.rateLimit?.resetTime
    ? (req.rateLimit.resetTime.getTime() - Date.now()) / 60000
    : 10));
  res.status(429).json({
    status: false,
    error: "RATE_LIMIT_EXCEEDED",
    msg: `Too many attempts. Please wait ${waitMin > 0 ? waitMin + " minute" + (waitMin > 1 ? "s" : "") : "a moment"} and try again.`,
  });
};

/* ---- Login attempts: 8 per 10 minutes per IP ---- */
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: limiterHandler,
});

/* ---- Token refresh: 20 per 10 minutes per IP ---- */
export const tokenLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: limiterHandler,
});

/* ---- Write operations (create/update/delete): 120 per 10 minutes ---- */
export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: limiterHandler,
});

/* =====================================================================
 * Account lockout — per-phone brute-force protection (in-memory)
 * 5 wrong passwords within the window locks the account for 15 minutes.
 * ====================================================================*/
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

/** @type {Map<string, {count:number, firstAt:number, lockedUntil:number}>} */
const attempts = new Map();

/* periodic cleanup so the map never grows unbounded */
const CLEANUP_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, a] of attempts) {
    if (a.lockedUntil && a.lockedUntil < now) attempts.delete(key);
    else if (!a.lockedUntil && now - a.firstAt > FAILURE_WINDOW_MS) attempts.delete(key);
  }
}, CLEANUP_MS).unref?.();

export const isAccountLocked = (phone) => {
  const a = attempts.get(String(phone));
  if (!a || !a.lockedUntil) return 0;
  const remainMs = a.lockedUntil - Date.now();
  if (remainMs <= 0) {
    attempts.delete(String(phone));
    return 0;
  }
  return Math.ceil(remainMs / 60000); // minutes remaining
};

export const recordLoginFailure = (phone) => {
  const key = String(phone);
  const now = Date.now();
  const a = attempts.get(key) || { count: 0, firstAt: now, lockedUntil: 0 };
  // reset the window if it has expired
  if (now - a.firstAt > FAILURE_WINDOW_MS) { a.count = 0; a.firstAt = now; }
  a.count += 1;
  if (a.count >= MAX_FAILURES) {
    a.lockedUntil = now + LOCK_MINUTES * 60000;
    a.count = 0; // failures consumed by the lock
  }
  attempts.set(key, a);
};

export const resetLoginFailures = (phone) => attempts.delete(String(phone));
