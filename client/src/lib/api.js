/**
 * wraps fetch with error handling and JSON parsing
 * all functions throw an ApiError on non-2xx responses
 */

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name   = 'ApiError'
    this.status = status
  }
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res  = await fetch('/api' + path, opts)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, res.status)
  return data
}

// authentication
export const authApi = {
  signUp: (p) => request('POST', '/auth/signup', p),
  signIn: (p) => request('POST', '/auth/signin', p),
  signOut: () => request('POST', '/auth/signout'),
  me: () => request('GET',  '/auth/me'),
}

// entries
export const entriesApi = {
  list(filters = {}) {
    const params = new URLSearchParams()
    if (filters.type && filters.type !== 'all') params.set('type', filters.type)
    if (filters.status && filters.status !== 'all') params.set('status', filters.status)
    if (filters.query?.trim()) params.set('q', filters.query.trim())
    const qs = params.toString()
    return request('GET', `/entries${qs ? '?' + qs : ''}`)
  },
  create: (draft) => request('POST', '/entries', draft),
  update: (id, draft) => request('PATCH', `/entries/${id}`, draft),
  delete: (id) => request('DELETE', `/entries/${id}`),
}

// profile
export const profileApi = {
  update: (p) => request('PATCH', '/profile', p),
  updateAvatar: (a) => request('PATCH', '/profile/avatar', { avatar: a }),
}

// for movies + tv shows: tmdb
export const tmdbApi = {
  /** @param {string} q  @param {'movie'|'tv'} type */
  search: (q, type) => {
    const p = new URLSearchParams({ q, type })
    return request('GET', `/tmdb/search?${p}`)
  },
}

// for anime + manga: anilist
export const anilistApi = {
  /** @param {string} q  @param {'anime'|'manga'} type */
  search: (q, type) => {
    const p = new URLSearchParams({ q, type })
    return request('GET', `/anilist/search?${p}`)
  },
}

// books: openlibrary
export const openlibraryApi = {
  /** @param {string} q */
  search: (q) => {
    const p = new URLSearchParams({ q })
    return request('GET', `/openlibrary/search?${p}`)
  },
}

// albums: spotify
export const spotifyApi = {
  /** @param {string} q */
  search: (q) => {
    const p = new URLSearchParams({ q })
    return request('GET', `/spotify/search?${p}`)
  },
  /** @param {string} albumId */
  getTracks: (albumId) => {
    const p = new URLSearchParams({ albumId })
    return request('GET', `/spotify/tracks?${p}`)
  },
}

// image proxy (server-side poster fetch to avoid CORS)
export const imageApi = {
  /**
   * fetches a remote image via the server and returns a base64 data URL.
   * @param {string} url 
   */
  fetchPoster: async (url) => {
    const p = new URLSearchParams({ url })
    const data = await request('GET', `/tmdb/poster?${p}`)
    return data.dataUrl
  },
}

// append to entriesApi — pin toggle
export const pinApi = {
  /** oggle pin state for an entry. returns the updated entry. */
  toggle: (id) => request('PATCH', `/entries/${id}/pin`),
}
