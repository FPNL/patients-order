import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Kysely } from 'kysely'
import { FileMigrationProvider, Migrator } from 'kysely/migration'
import type { Database } from './schema'

const migrationFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

/**
 * 測試與正式環境跑的是同一批 migration 檔案，所以 migration 本身也在
 * 紅綠燈的保護範圍內——這是選 PGlite 而非 SQLite 的主要理由。
 */
export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({ fs, path, migrationFolder }),
  })

  const { error, results } = await migrator.migrateToLatest()
  if (error) {
    const failed = results?.find((r) => r.status === 'Error')
    throw new Error(`Migration failed${failed ? ` at ${failed.migrationName}` : ''}: ${String(error)}`)
  }
}
