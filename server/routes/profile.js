const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { queryOne } = require('../db');
const { requireAuth } = require('../middleware/auth');

// PATCH /api/profile 
router.patch('/', requireAuth, async (req, res) => {
  try {
    const { name, username, bio, password } = req.body;
    const userId = req.user.userId;

    if (!name?.trim()) return res.status(400).json({ error: 'Display name is required.' });
    if (!username?.trim()) return res.status(400).json({ error: 'Username is required.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores.' });

    const current = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    if (!current) return res.status(404).json({ error: 'User not found.' });

    // check username availability (allow keeping same username - citext handles case)
    if (username.toLowerCase() !== current.username.toLowerCase()) {
      const taken = await queryOne(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username.toLowerCase(), userId]
      );
      if (taken) return res.status(409).json({ error: 'That username is already taken.' });
    }

    // hashing
    let hash = current.password;
    if (password) {
      if (password.length < 6)
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      hash = await bcrypt.hash(password, 12);
    }

    // updating username
    const updated = await queryOne(
      `UPDATE users
       SET name = $1, username = $2, bio = $3, password = $4
       WHERE id = $5
       RETURNING id, username, name, bio, avatar, joined_at`,
      [name.trim(), username.toLowerCase(), (bio || '').trim(), hash, userId]
    );
    res.json({ user: sanitize(updated) });
  } catch (err) {
    console.error('profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PATCH /api/profile/avatar
router.patch('/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: 'No avatar provided.' });
    if (!avatar.startsWith('data:image/'))
      return res.status(400).json({ error: 'Avatar must be a valid image data URL.' });
    if (avatar.length > 500_000)
      return res.status(400).json({ error: 'Avatar image is too large. Please use a smaller image.' });

    const updated = await queryOne(
      `UPDATE users SET avatar = $1 WHERE id = $2
       RETURNING id, username, name, bio, avatar, joined_at`,
      [avatar, req.user.userId]
    );
    res.json({ user: sanitize(updated) });
  } catch (err) {
    console.error('avatar update error:', err);
    res.status(500).json({ error: 'Failed to update avatar.' });
  }
});

function sanitize(u) {
  return { id: u.id, username: u.username, name: u.name, bio: u.bio||'', avatar: u.avatar||null, joinedAt: u.joined_at };
}

module.exports = router;
