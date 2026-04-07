# ilkda 익다 — Personal Media Tracker (React + Express + PostgreSQL)

personal media tracker. React + Vite frontend, Express backend, PostgreSQL database.

---

## Requirements

Node.js and Docker or PostgreSQL

---

## Quick start

```bash
# 1. start PostgreSQL
docker compose up -d

# 2. install all dependencies (root + client)
npm install
cd client
npm install
cd ..

# 3. apply the database schema
npm run db:migrate

# 4. start both servers in one terminal
npm run dev

react dev server: http://localhost:5173
```
## Production build

```bash
npm run build   # builds client into ilkda/public/
npm start       # express serves the built frontend + API on :3000
```

generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
