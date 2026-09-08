import rateLimit from 'express-rate-limit';
/**
 * Rate limiter for public approval endpoints.
 * 20 requests per minute per IP.
 */
export const approvalRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in a minute.' },
});
//# sourceMappingURL=rateLimit.js.map