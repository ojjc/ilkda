const router = require('express').Router()
const { requireAuth } = require('../middleware/auth')

const ANILIST_URL = 'https://graphql.anilist.co'

const cache = new Map()
const CACHE_TTL = 30_000 //30000 secs

// so we limit api calls
function cacheKey(q, type) { return `${type}:${q.toLowerCase().trim()}` }

// fetches studios (anime) and staff/author (manga) in one query
const SEARCH_QUERY = `
  query ($search: String, $type: MediaType) {
    Page(page: 1, perPage: 8) {
      media(search: $search, type: $type, sort: POPULARITY_DESC) {
        id
        type
        title { romaji english native }
        description(asHtml: false)
        coverImage { large medium }
        startDate { year }
        episodes
        chapters
        volumes
        averageScore
        status
        genres
        format
        studios(isMain: true) {
          nodes { name }
        }
        staff(perPage: 5) {
          edges {
            role
            node { name { full } }
          }
        }
      }
    }
  }
`

//GET /api/anilist/search?q=...&type=anime|manga 
router.get('/search', requireAuth, async (req, res) => {
  const { q, type } = req.query

  if (!q?.trim()) return res.status(400).json({ error: 'Query is required.' })
  if (!['anime', 'manga'].includes(type)) return res.status(400).json({ error: 'Invalid type. Use anime or manga.' })

  // caching token
  const key = cacheKey(q, type)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ results: cached.results })
  }

  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { search: q.trim(), type: type.toUpperCase() },
      }),
    })

    if (response.status === 429) {
      return res.status(429).json({ error: 'AniList rate limit hit. Please wait a moment and try again.' })
    }
    if (!response.ok) {
      console.error('AniList error:', response.status)
      return res.status(502).json({ error: `AniList API error (${response.status}).` })
    }

    const json = await response.json()
    const media = json?.data?.Page?.media ?? []

    const results = media.map((item) => {
      const isAnime = item.type === 'ANIME'

      const title = item.title.english || item.title.romaji || item.title.native || ''

      const rawDesc = item.description || ''
      const overview = rawDesc
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/~!.*?!~/gs, '')
        .replace(/\(Source:.*?\)/g, '')
        .trim()

      // extracting "creator"
      let creator = ''
      if (isAnime) {
        // primary animation studio for anime
        creator = item.studios?.nodes?.[0]?.name ?? ''
      } else {
        // original author for manga 
        const authorEdge = (item.staff?.edges ?? []).find((e) =>
          //look for "Story" or "Story & Art" role
          /story|author|original/i.test(e.role)
        ) ?? item.staff?.edges?.[0]
        creator = authorEdge?.node?.name?.full ?? ''
      }

      return {
        id: item.id,
        title,
        titleRomaji: item.title.romaji || null,
        titleNative: item.title.native || null,
        year: item.startDate?.year ?? null,
        overview,
        posterUrl: item.coverImage?.large || item.coverImage?.medium || null,
        rating: item.averageScore ? (item.averageScore / 10).toFixed(1) : null,
        status: item.status || null,
        genres: item.genres || [],
        format: item.format || null,
        creator,
        // for anime
        episodes: isAnime ? (item.episodes ?? null) : null,
        // manga has chapts
        chapters: !isAnime ? (item.chapters ?? null) : null,
        volumes: !isAnime ? (item.volumes ?? null) : null,
      }
    })

    cache.set(key, { results, ts: Date.now() })
    if (cache.size > 300) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      cache.delete(oldest[0])
    }

    res.json({ results })
  } catch (err) {
    console.error('AniList fetch error:', err)
    res.status(502).json({ error: 'Failed to reach AniList. Check your connection.' })
  }
})

module.exports = router
