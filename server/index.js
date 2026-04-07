const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const express = require('express')
const cookieParser = require('cookie-parser')
const { testConnection } = require('./db')
const authRouter = require('./routes/auth')
const entriesRouter = require('./routes/entries')
const profileRouter = require('./routes/profile')
const tmdbRouter = require('./routes/tmdb')
const anilistRouter = require('./routes/anilist')
const openLibRouter = require('./routes/openlibrary')
const spotifyRouter = require('./routes/spotify')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '../public')))

app.use('/api/auth', authRouter)
app.use('/api/entries', entriesRouter)
app.use('/api/profile', profileRouter)
app.use('/api/tmdb', tmdbRouter)
app.use('/api/anilist', anilistRouter)
app.use('/api/openlibrary', openLibRouter)
app.use('/api/spotify', spotifyRouter)

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'))
})

;(async () => {
  await testConnection()
  app.listen(PORT, () => {
    console.log(`\n  ILKDA running → http://localhost:${PORT}\n`)
    if (!process.env.TMDB_API_KEY || process.env.TMDB_API_KEY === 'your_tmdb_api_key_here') {
      console.warn(' WARNING: TMDB_API_KEY not set - cannot search for movies / tv shows\n')
    }
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.warn(' WARNING: SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set - you cannot search for albums right now\n')
    }
  })
})()
