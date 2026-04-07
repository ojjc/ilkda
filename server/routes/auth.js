const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { queryOne } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  // secure: true  ← uncomment when serving over HTTPS
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name?.trim())     return res.status(400).json({ error: 'Display name is required.' });
    if (!username?.trim()) return res.status(400).json({ error: 'Username is required.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores.' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) return res.status(409).json({ error: 'That username is already taken.' });

    const hash = await bcrypt.hash(password, 12);
    const user = await queryOne(
      `INSERT INTO users (username, name, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, name, bio, avatar, joined_at`,
      [username.toLowerCase(), name.trim(), hash]
    );

    const token = signToken({ userId: user.id, username: user.username });
    res.cookie('token', token, COOKIE_OPTS);
    res.status(201).json({ user: sanitize(user) });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ error: 'Server error during sign up.' });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required.' });

    const user = await queryOne('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)  return res.status(401).json({ error: 'Invalid username or password.' });

    const token = signToken({ userId: user.id, username: user.username });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user: sanitize(user) });
  } catch (err) {
    console.error('signin error:', err);
    res.status(500).json({ error: 'Server error during sign in.' });
  }
});

// POST /api/auth/signout
router.post('/signout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /api/auth/me
// retrieving user info 
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, username, name, bio, avatar, joined_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: sanitize(user) });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

function sanitize(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    bio: u.bio || '',
    avatar: u.avatar || null,
    joinedAt: u.joined_at,
  };
}

module.exports = router;
