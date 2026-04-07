const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const router = require('express').Router()
const { requireAuth } = require('../middleware/auth')

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

function getKey() { return process.env.TMDB_API_KEY }

/**
 * fetch the director for a movie from the credits endpoint returns the first director name found, or null
 */
async function fetchMovieDirector(id, key) {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${id}/credits?api_key=${key}`)
    if (!res.ok) return null
    const data = await res.json()
    const dir  = (data.crew ?? []).find((c) => c.job === 'Director')
    return dir?.name ?? null
  } catch { return null }
}

/**
 * fetch TV show details: first broadcast network + season list
 * returns { network, seasons } where seasons is an array of season objects.
 */
async function fetchTvDetails(id, key) {
  try {
    const res  = await fetch(`${TMDB_BASE}/tv/${id}?api_key=${key}`)
    if (!res.ok) return { network: null, seasons: [] }
    const data = await res.json()
    const network = data.networks?.[0]?.name ?? null
    // filter out "Specials" (season_number === 0) and match it to our db shape
    const seasons = (data.seasons ?? [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        number: s.season_number,
        name: s.name || `Season ${s.season_number}`,
        episodeCount: s.episode_count || 0,
        watchedEpisodes: 0,
        status: 'planning',
        score: 0,
        notes: '',
      }))
    return { network, seasons }
  } catch { return { network: null, seasons: [] } }
}

// GET /api/tmdb/search?q=...&type=movie|tv 
router.get('/search', requireAuth, async (req, res) => {
  const { q, type } = req.query

  if (!q?.trim()) return res.status(400).json({ error: 'Query is required.' })
  if (!['movie', 'tv'].includes(type)) return res.status(400).json({ error: 'Invalid type. Use movie or tv.' })

  const key = getKey()
  if (!key || key === 'your_tmdb_api_key_here') {
    return res.status(503).json({ error: 'TMDB API key not configured. Add TMDB_API_KEY to your .env file.' })
  }

  const params = new URLSearchParams({
    api_key: key, query: q.trim(),
    include_adult: 'false', language: 'en-US', page: '1',
  })

  try {
    const response = await fetch(`${TMDB_BASE}/search/${type}?${params}`)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      console.error('TMDB error:', response.status, body)
      return res.status(502).json({ error: `TMDB error ${response.status}: ${body.status_message ?? 'Check your API key.'}` })
    }

    const data = await response.json()
    const isMovie = type === 'movie'
    const items = (data.results ?? []).slice(0, 8)

    // fetch creator data (director / network) in parallel for all results
    const creators = await Promise.all(
      items.map((item) =>
        isMovie ? fetchMovieDirector(item.id, key).then((d) => ({ network: null, seasons: [], director: d })) : fetchTvDetails(item.id, key).then((d) => ({ ...d, director: null }))
      )
    )

    const results = items.map((item, i) => {
      const title = isMovie ? item.title : item.name
      const released = isMovie ? item.release_date : item.first_air_date
      const year = released ? Number(released.slice(0, 4)) : null
      const c  = creators[i]

      return {
        id: item.id,
        title,
        year,
        overview: item.overview || '',
        posterUrl: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null,
        rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
        creator: (isMovie ? c.director : c.network) || '',
        seasons: isMovie ? [] : (c.seasons ?? []),
      }
    })

    res.json({ results })
  } catch (err) {
    console.error('TMDB fetch error:', err)
    res.status(502).json({ error: 'Failed to reach TMDB. Check your connection.' })
  }
})

// GET /api/tmdb/poster?url=... 
router.get('/poster', requireAuth, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url is required.' })

  let parsed
  try { parsed = new URL(url) } catch { return res.status(400).json({ error: 'Invalid URL.' }) }

  const ALLOWED = [
    'image.tmdb.org',
    'cdn.myanimelist.net',
    's4.anilist.co',
    'img1.ak.crunchyroll.com',
    'covers.openlibrary.org',
    'i.scdn.co', // spotify album art CDN
    'mosaic.scdn.co', // spotify mosaic covers
  ]
  if (!ALLOWED.some((h) => parsed.hostname.endsWith(h))) {
    return res.status(403).json({ error: 'Image host not allowed.' })
  }

  try {
    const response = await fetch(url)
    if (!response.ok) return res.status(502).json({ error: 'Failed to fetch image.' })
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const base64 = Buffer.from(buffer).toString('base64')
    res.json({ dataUrl: `data:${contentType};base64,${base64}` })
  } catch (err) {
    console.error('Poster proxy error:', err)
    res.status(502).json({ error: 'Failed to proxy image.' })
  }
})

module.exports = router
