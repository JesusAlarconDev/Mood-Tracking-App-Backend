const jwt = require('jsonwebtoken');

function extractToken(req) {
    const authHeader = req.header('Authorization');
    if (!authHeader) return null;

    const parts = authHeader.trim().split(/\s+/);
    if (parts[0].toLowerCase() === 'bearer' && parts[1]) {
        return parts[1];
    }
    if (parts.length === 1 && parts[0].includes('.')) {
        return parts[0];
    }
    return null;
}

function authenticateToken(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            message: 'Token no proporcionado. Usa Authorization: Bearer <tu_token>'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
        req.user = payload;
        next();
    });
}

module.exports = authenticateToken;