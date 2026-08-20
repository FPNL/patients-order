import { sql, type Kysely } from 'kysely'

// 住民是固定資料，本 API 不提供新增、修改或刪除，因此 id 不用 serial，
// 直接在這裡指定；seed 也放在同一份 migration，讓測試資料庫與正式環境
// 套用完全相同的一批住民。
const PATIENTS = [
  { id: 1, name: '小民' },
  { id: 2, name: '阿珠' },
  { id: 3, name: '志明' },
  { id: 4, name: '春嬌' },
  { id: 5, name: '阿英' },
]

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('patients')
    .addColumn('id', 'integer', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .execute()

  await sql`insert into patients (id, name) values ${sql.join(
    PATIENTS.map((p) => sql`(${p.id}, ${p.name})`),
  )}`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('patients').execute()
}
