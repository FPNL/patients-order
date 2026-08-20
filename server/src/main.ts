import { createApp } from './app'
import { ConfigError, loadConfig } from './config'
import { createDatabase } from './db/database'
import { migrateToLatest } from './db/migrator'

let config
try {
  config = loadConfig(process.argv.slice(2))
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(err.message)
    process.exit(1)
  }
  throw err
}

const db = createDatabase(config.database.url)
await migrateToLatest(db)

createApp(db).listen(config.port, () => {
  console.log(`server listening on http://localhost:${config.port}`)
})
