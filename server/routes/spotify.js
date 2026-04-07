const path = require('path')
const router = require('express').Router()
const { requireAuth } = require('../middleware/auth')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const clientId = process.env.SPOTIFY_CLIENT_ID
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

async function isAlbumExplicit(albumId, token) {
  const res = await fetch(
    `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  const data = await res.json()
  return (data.items ?? []).some(track => track.explicit)
}

// token cache (client credentials, expires in ~1hr)
let tokenCache = { token: null, expiresAt: 0 }

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 30_000) {
    return tokenCache.token
  }
  const res  = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Spotify auth failed')
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return tokenCache.token
}

// result cache (search + tracks)
const cache = new Map()
const CACHE_TTL = 60_000

function cacheGet(key) { const h = cache.get(key); return h && Date.now() - h.ts < CACHE_TTL ? h.data : null }
function cacheSet(key, data) {
  cache.set(key, { data, ts: Date.now() })
  if (cache.size > 300) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
    cache.delete(oldest[0])
  }
}

router.get('/search', requireAuth, async (req, res) => {
  const { q } = req.query
  if (!q?.trim()) return res.status(400).json({ error: 'Query is required.' })

  const key = `search:${q.toLowerCase().trim()}`
  const cached = cacheGet(key)
  if (cached) return res.json({ results: cached })

  try {
    const token = await getAccessToken()

    const r = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=8`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const data = await r.json()
    const rawAlbums = data.albums?.items ?? []

    // grouping dupes
    const grouped = new Map()

    for (const album of rawAlbums) {
      const groupKey = `${album.name.toLowerCase()}|${album.artists.map(a => a.name).join(',').toLowerCase()}`
      if (!grouped.has(groupKey)) grouped.set(groupKey, [])
      grouped.get(groupKey).push(album)
    }

    // resolve (parallel)
    const filteredAlbums = await Promise.all(
      [...grouped.values()].map(async (group) => {
        if (group.length === 1) return group[0]

        const checks = await Promise.all(
          group.map(async (album) => {
            const explicit = await isAlbumExplicit(album.id, token)
            return { album, explicit }
          })
        )

        const explicitMatch = checks.find(c => c.explicit)
        return explicitMatch?.album || group[0]
      })
    )

    // map result
    const results = filteredAlbums.map((album) => ({
      id: album.id,
      title: album.name,
      creator: album.artists?.map(a => a.name).join(', ') || '',
      year: album.release_date?.split('-')[0] || null,
      totalTracks: album.total_tracks,
      posterUrl: album.images?.[1]?.url || album.images?.[0]?.url || null,
      spotifyUrl: album.external_urls?.spotify || null,
    }))

    cacheSet(key, results)
    res.json({ results })

  } catch (e) {
    console.error('Spotify search error', e)
    res.status(502).json({ error: 'Failed to fetch from Spotify API.' })
  }
})

// GET /api/spotify/tracks?albumId=
router.get('/tracks', requireAuth, async (req, res) => {
  const { albumId } = req.query
  if (!albumId?.trim()) return res.status(400).json({ error: 'albumId is required.' })

  const key = `tracks:${albumId}`
  const cached = cacheGet(key)
  if (cached) return res.json({ tracks: cached })

  try {
    const token = await getAccessToken()
    const r = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await r.json()

    const tracks = (data.items ?? []).map((t) => ({
      id: t.id,
      trackNumber: t.track_number,
      name: t.name,
      durationMs: t.duration_ms,
    }))

    cacheSet(key, tracks)
    res.json({ tracks })
  } catch (e) {
    console.error('Spotify tracks error', e)
    res.status(502).json({ error: 'Failed to fetch tracks from Spotify API.' })
  }
})

module.exports = router
