import type { PGlite } from '@electric-sql/pglite'
import {
  CompiledQuery,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type DialectAdapter,
  type Driver,
  type Kysely,
  type QueryCompiler,
  type QueryResult,
} from 'kysely'

/**
 * Kysely 連 PGlite 用的 dialect。
 *
 * 自己實作而不是用社群套件，是因為現有的社群 adapter 會把一份舊版
 * kysely 一起裝進來（帶有未修補的 SQL injection 公告），或把 PGlite
 * 的版本鎖在更舊的 major。Kysely 的 dialect 是文件化的擴充點，
 * 這裡只是把 Postgres 的 adapter／compiler／introspector 原樣沿用，
 * 換掉負責執行的 driver 而已——SQL 產生方式與正式環境完全相同。
 */
class PGliteConnection implements DatabaseConnection {
  constructor(private readonly client: PGlite) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const result = await this.client.query<R>(compiledQuery.sql, [...compiledQuery.parameters])

    return {
      rows: result.rows,
      numAffectedRows: BigInt(result.affectedRows ?? 0),
    }
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('PGlite dialect 不支援 streaming')
  }
}

class PGliteDriver implements Driver {
  private readonly connection: PGliteConnection

  constructor(private readonly client: PGlite) {
    this.connection = new PGliteConnection(client)
  }

  async init(): Promise<void> {}

  // PGlite 是單一 in-process 實例，沒有連線池的概念，永遠回同一條連線。
  async acquireConnection(): Promise<DatabaseConnection> {
    return this.connection
  }

  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw('begin'))
  }

  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw('commit'))
  }

  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw('rollback'))
  }

  async releaseConnection(): Promise<void> {}

  async destroy(): Promise<void> {
    await this.client.close()
  }
}

export class PGliteDialect implements Dialect {
  constructor(private readonly client: PGlite) {}

  createAdapter(): DialectAdapter {
    return new PostgresAdapter()
  }

  createDriver(): Driver {
    return new PGliteDriver(this.client)
  }

  createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
    return new PostgresIntrospector(db)
  }

  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler()
  }
}
