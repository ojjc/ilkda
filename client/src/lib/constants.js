/** @type {Record<string, { label: string, color: string, emoji: string }>} */
export const TYPE_META = {
  anime: { label: 'Anime', color: 'var(--anime)', emoji: '🎌' },
  manga: { label: 'Manga', color: 'var(--manga)', emoji: '📖' },
  movie: { label: 'Movie', color: 'var(--movie)', emoji: '🎬' },
  album: { label: 'Album', color: 'var(--album)', emoji: '🎵' },
  tv: { label: 'TV', color: 'var(--tv)', emoji: '📺' },
  book: { label: 'Book', color: 'var(--book)', emoji: '📚' },
  game: { label: 'Game', color: 'var(--game)', emoji: '🎮' },
}

/** @type {Record<string, { label: string, color: string }>} */
export const STATUS_META = {
  completed: { label: 'Completed', color: 'var(--success)' },
  'in-progress': { label: 'In Progress', color: 'var(--accent)' },
  planning: { label: 'Planning', color: 'var(--accent2)' },
  dropped: { label: 'Dropped', color: 'var(--danger)' },
  'on-hold': { label: 'On Hold', color: 'var(--muted)'  },
}

export const MEDIA_TYPES = /** @type {string[]} */ (Object.keys(TYPE_META))
export const ENTRY_STATUSES = /** @type {string[]} */ (Object.keys(STATUS_META))

/** @type {Record<string, string>} */
export const PAGE_TITLES = {
  all: 'All Media',
  anime: 'Anime',
  tv: 'TV Shows',
  movie: 'Movies',
  manga: 'Manga',
  book: 'Books',
  game: 'Games',
  album: 'Albums',
}

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All'},
  { value: 'completed', label: 'Done'},
  { value: 'in-progress', label: 'Active'},
  { value: 'planning', label: 'Planned'},
  { value: 'dropped',  label: 'Dropped'},
]
