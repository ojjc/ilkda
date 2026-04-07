const router = require('express').Router()
const { queryOne, queryAll, query } = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

const VALID_TYPES = ['anime','tv','movie','manga','book','game','album']
const VALID_STATUSES = ['planning','in-progress','completed','on-hold','dropped']
const PIN_LIMIT = 5

//GET /api/entries
router.get('/', async (req, res) => {
  try {
    const { type, status, q } = req.query
    const conditions = ['user_id = $1']
    const params = [req.user.userId]
    let p = 2

    if (type && VALID_TYPES.includes(type)) { conditions.push(`type = $${p++}`); params.push(type) }
    if (status && VALID_STATUSES.includes(status)) { conditions.push(`status = $${p++}`); params.push(status) }
    if (q?.trim()) { conditions.push(`title ILIKE $${p++}`); params.push(`%${q.trim()}%`) }

    const rows = await queryAll(
      `SELECT * FROM entries WHERE ${conditions.join(' AND ')} ORDER BY pinned DESC, updated_at DESC`,
      params
    )
    res.json({ entries: rows.map(toClient) })
  } catch (err) {
    console.error('entries list error:', err)
    res.status(500).json({ error: 'Failed to fetch entries.' })
  }
})

// POST /api/entries 
router.post('/', async (req, res) => {
  try {
    const { type, title, status, progress, score, notes, description, year, creator, isbn, pages, image, tracks, seasons } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' })
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid media type.' })

    const entry = await queryOne(
      `INSERT INTO entries
         (user_id, type, title, status, progress, score, notes, description, year, creator, isbn, pages, image, tracks, seasons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        req.user.userId, type, title.trim(),
        VALID_STATUSES.includes(status) ? status : 'planning',
        progress || '',
        Math.max(0, Math.min(10, Number(score) || 0)),
        notes || '',
        description || '',
        year ? Number(year)  : null,
        creator || '',
        isbn || null,
        pages ? Number(pages) : null,
        image || null,
        JSON.stringify(Array.isArray(tracks) ? tracks : []),
        JSON.stringify(Array.isArray(seasons) ? seasons : []),
      ]
    )
    res.status(201).json({ entry: toClient(entry) })
  } catch (err) {
    console.error('entry create error:', err)
    res.status(500).json({ error: 'Failed to create entry.' })
  }
})

// PATCH /api/entries/:id 
router.patch('/:id', async (req, res) => {
  try {
    const existing = await queryOne(
      'SELECT * FROM entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!existing) return res.status(404).json({ error: 'Entry not found.' })

    const { type, title, status, progress, score, notes, description, year, creator, isbn, pages, image, tracks, seasons } = req.body

    const entry = await queryOne(
      `UPDATE entries
       SET type = $1,
           title = $2,
           status = $3,
           progress = $4,
           score = $5,
           notes = $6,
           description = $7,
           year = $8,
           creator = $9,
           isbn = $10,
           pages = $11,
           image = $12,
           tracks = $13,
           seasons = $14
       WHERE id = $15 AND user_id = $16
       RETURNING *`,
      [
        VALID_TYPES.includes(type) ? type : existing.type,
        title?.trim() || existing.title,
        VALID_STATUSES.includes(status) ? status : existing.status,
        progress !== undefined ? progress : existing.progress,
        score !== undefined ? Math.max(0, Math.min(10, Number(score))) : existing.score,
        notes !== undefined ? notes : existing.notes,
        description !== undefined ? description : existing.description,
        year !== undefined ? (year ? Number(year) : null) : existing.year,
        creator !== undefined ? creator : existing.creator,
        isbn !== undefined ? (isbn || null) : existing.isbn,
        pages !== undefined ? (pages ? Number(pages) : null) : existing.pages,
        image !== undefined ? image : existing.image,
        tracks !== undefined ? JSON.stringify(Array.isArray(tracks) ? tracks  : []) : existing.tracks,
        seasons !== undefined ? JSON.stringify(Array.isArray(seasons) ? seasons : []) : existing.seasons,
        req.params.id, req.user.userId,
      ]
    )
    res.json({ entry: toClient(entry) })
  } catch (err) {
    console.error('entry update error:', err)
    res.status(500).json({ error: 'Failed to update entry.' })
  }
})

// PATCH /api/entries/:id/pin
router.patch('/:id/pin', requireAuth, async (req, res) => {
  try {
    const existing = await queryOne(
      'SELECT * FROM entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!existing) return res.status(404).json({ error: 'Entry not found.' })

    const newPinned = !existing.pinned

    if (newPinned) {
      const { rows } = await query(
        'SELECT COUNT(*) FROM entries WHERE user_id = $1 AND pinned = TRUE',
        [req.user.userId]
      )
      if (Number(rows[0].count) >= PIN_LIMIT) {
        return res.status(409).json({
          error: `You can only pin up to ${PIN_LIMIT} entries. Unpin one first.`,
        })
      }
    }

    const entry = await queryOne(
      'UPDATE entries SET pinned = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [newPinned, req.params.id, req.user.userId]
    )
    res.json({ entry: toClient(entry) })
  } catch (err) {
    console.error('pin toggle error:', err)
    res.status(500).json({ error: 'Failed to update pin.' })
  }
})

// DELETE /api/entries/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Entry not found.' })
    res.json({ ok: true })
  } catch (err) {
    console.error('entry delete error:', err)
    res.status(500).json({ error: 'Failed to delete entry.' })
  }
})

function toClient(e) {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    status: e.status,
    progress: e.progress || '',
    score: e.score || 0,
    notes: e.notes || '',
    description: e.description || '',
    year: e.year ?? null,
    creator: e.creator || '',
    isbn: e.isbn ?? null,
    pages: e.pages ?? null,
    pinned: e.pinned ?? false,
    image: e.image || null,
    tracks: Array.isArray(e.tracks)  ? e.tracks  : (e.tracks  ? JSON.parse(e.tracks) : []),
    seasons: Array.isArray(e.seasons) ? e.seasons : (e.seasons ? JSON.parse(e.seasons) : []),
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

module.exports = router
