import { Router } from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'

/** 掛在 /api 底下的住民端點。 */
export function patientRouter(db: Kysely<Database>): Router {
  const router = Router()

  router.get('/patients', async (_req, res) => {
    const patients = await db
      .selectFrom('patients')
      .select(['id', 'name'])
      .orderBy('id')
      .execute()

    res.json(patients)
  })

  return router
}
