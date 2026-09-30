import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' && !process.env.VERCEL ? 'dev-jwt-secret-do-not-use-in-production' : undefined);

if (!JWT_SECRET) {
  console.error('[SECURITY] FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

export const authenticate = (req, res, next) => {
    // Standard JWT Authentication
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'AUTHENTICATION_REQUIRED', 
            details: 'No session token provided in headers.' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        let code = 'SESSION_INVALID';
        let detail = 'Session verification failed.';

        if (error.name === 'TokenExpiredError') {
            code = 'SESSION_EXPIRED';
            detail = 'Session has expired.';
        } else if (error.name === 'JsonWebTokenError') {
            code = 'SESSION_CORRUPTED';
            detail = 'Session token is malformed.';
        }

        res.status(401).json({ 
            success: false, 
            error: code,
            details: detail
        });
    }
};
