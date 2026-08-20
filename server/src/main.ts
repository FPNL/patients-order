import { createApp } from './app'
import * as config from './config'
import { ConfigError, configPathFromArgv, readConfig } from './config'
import * as database from './db/database'
import { createDatabase } from './db/database'
import { migrateToLatest } from './db/migrator'

try {
  readConfig(configPathFromArgv(process.argv.slice(2)))
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(err.message)
    process.exit(1)
  }
  throw err
}

createDatabase(config.Default.database.url)
await migrateToLatest(database.Default)

const server = createApp().listen(config.Default.port, () => {
  console.log(`server listening on http://localhost:${config.Default.port}`)
})

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  // 第二次訊號代表對方沒耐心了，直接走。
  if (shuttingDown) {
    process.exit(1)
  }
  shuttingDown = true
  console.log(`received ${signal}, shutting down`)

  // server.close() 會停止接受新連線，但會一直等到既有連線都結束為止。
  // keep-alive 的連線可能閒置著卻不關，所以要有這個上限——時間到就把還
  // 開著的連線砍掉，讓 close 的 callback 得以觸發。
  const force = setTimeout(() => {
    console.error(`graceful shutdown timed out after ${config.Default.shutdown_timeout}ms`)
    server.closeAllConnections()
  }, config.Default.shutdown_timeout)

  await new Promise<void>((resolve) => server.close(() => resolve()))
  clearTimeout(force)

  await database.Default.destroy()
  console.log('shutdown complete')
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    void shutdown(signal)
  })
}
