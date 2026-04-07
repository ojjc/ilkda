const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'ilkda-dev-secret-change-in-production';
const JWT_EXPIRES = '30d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
}

module.exports = { signToken, verifyToken, requireAuth };
