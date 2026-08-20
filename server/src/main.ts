import { createApp } from './app'
import { createDatabase } from './db/database'
import { migrateToLatest } from './db/migrator'

const port = Number(process.env.PORT ?? 3001)
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is not set; copy .env.example to .env first')
  process.exit(1)
}

const db = createDatabase(connectionString)
await migrateToLatest(db)

createApp(db).listen(port, () => {
  console.log(`server listening on http://localhost:${port}`)
})
