import jwt from 'jsonwebtoken';

export const verifyToken = async (req, res, next) => {
    try {
        let token = req.header('Authorization');

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length).trimLeft();
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'JWT_SECRET is not configured' });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch the full user object to ensure we have latest roles/teams and user exists
        const user = await import('../models/User.js').then((m) =>
            m.default.findById(verified.id),
        );

        if (!user) {
            return res.status(401).json({ message: 'User no longer exists. Please login again.' });
        }

        // Never expose password hash downstream
        user.password = undefined;

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }

        return res.status(500).json({ error: 'Internal server error.' });
    }
};
