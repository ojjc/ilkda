const router = require('express').Router()
const { requireAuth } = require('../middleware/auth')

const OL_BASE = 'https://openlibrary.org'
const OL_COVER = 'https://covers.openlibrary.org/b'

const cache = new Map()
const CACHE_TTL = 60_000 // 60 seconds (books don't change often)

function cacheKey(q) { return `book:${q.toLowerCase().trim()}` }

// GET /api/openlibrary/search?q=... 
router.get('/search', requireAuth, async (req, res) => {
  const { q } = req.query
  if (!q?.trim()) return res.status(400).json({ error: 'Query is required.' })

  const key = cacheKey(q)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ results: cached.results })
  }

  try {
    const params = new URLSearchParams({
      q: q.trim(),
      limit: '8',
      fields: [
        'key',
        'title',
        'author_name',
        'first_publish_year',
        'isbn',
        'cover_i',
        'number_of_pages_median',
        'subject',
        'first_sentence',
      ].join(','),
    })

    const response = await fetch(`${OL_BASE}/search.json?${params}`, {
      headers: { "User-Agent": "ilkda/1.0 (ojjbin@gmail.com)" },
    })

    if (!response.ok) {
      console.error('OpenLibrary error:', response.status)
      return res.status(502).json({ error: `OpenLibrary API error (${response.status}).` })
    }

    const data = await response.json()
    const docs = data.docs ?? []

    const results = docs.slice(0, 8).map((doc) => {
      // finding isbn, isbn13 best
      const isbns = doc.isbn ?? []
      const isbn13 = isbns.find((s) => s.length === 13)
      const isbn10 = isbns.find((s) => s.length === 10)
      const isbn = isbn13 || isbn10 || isbns[0] || null

      // cover img - use cover_i (cover ID) if available
      const posterUrl = doc.cover_i ? `${OL_COVER}/id/${doc.cover_i}-M.jpg` : null

      // author name, 
      const author = doc.author_name?.[0] ?? ''

      // short desc from first sentence if available
      const overview = typeof doc.first_sentence === 'string' ? doc.first_sentence : (doc.first_sentence?.value ?? '')

      return {
        id: doc.key?.replace('/works/', '') ?? String(Math.random()),
        title: doc.title ?? '',
        year: doc.first_publish_year ?? null,
        creator: author,
        isbn,
        pages: doc.number_of_pages_median ?? null,
        overview,
        posterUrl,
        rating: null,
      }
    })

    cache.set(key, { results, ts: Date.now() })

    if (cache.size > 200) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      cache.delete(oldest[0])
    }

    res.json({ results })
  } catch (err) {
    console.error('OpenLibrary fetch error:', err)
    res.status(502).json({ error: 'Failed to reach OpenLibrary. Check your connection.' })
  }
})

module.exports = router
