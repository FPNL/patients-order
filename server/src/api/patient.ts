import type { RequestHandler } from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'

/** 契約的 listPatients：回傳全部住民，依 id 由小到大。 */
export function listPatients(db: Kysely<Database>): RequestHandler {
  return async (_req, res) => {
    const patients = await db
      .selectFrom('patients')
      .select(['id', 'name'])
      .orderBy('id')
      .execute()

    res.json(patients)
  }
}
