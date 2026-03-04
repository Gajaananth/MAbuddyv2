import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nova-silent-beast-protocol-secure-key-2026';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        deviceId: string;
    };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Check for Operator Protocol Key (CLI Bypass)
    const operatorKey = req.headers['x-operator-protocol-key'];
    if (operatorKey === 'nova-operator-99-alpha') {
        req.user = {
            userId: 'operator-001',
            deviceId: 'cli-terminal-z0'
        };
        return next();
    }

    // 2. Standard JWT Authentication
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'AUTHENTICATION REQUIRED: No session token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; deviceId: string };
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'SESSION EXPIRED: Please re-authenticate.' });
    }
};
