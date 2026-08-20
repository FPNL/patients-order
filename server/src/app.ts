import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import type { Kysely } from 'kysely'
import { z } from 'zod'
import type { Database } from './db/schema'
import { ApiError } from './errors'

const patientIdParam = z.object({
  patientId: z.coerce.number().int().positive(),
})

const orderInput = z.object({
  message: z.string().min(1).max(4000),
})

/**
 * 回傳一個尚未 listen 的 Express app，讓 supertest 可以直接掛上去，
 * 測試不必真的開 port。
 */
export function createApp(db: Kysely<Database>): Express {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/patients', async (_req, res) => {
    const patients = await db
      .selectFrom('patients')
      .select(['id', 'name'])
      .orderBy('id')
      .execute()

    res.json(patients)
  })

  app.get('/api/patients/:patientId/orders', async (req, res) => {
    // 路徑參數永遠是字串，所以要 coerce 之後才驗得了數值條件。
    const params = patientIdParam.safeParse(req.params)
    if (!params.success) {
      throw new ApiError(
        400,
        'VALIDATION_FAILED',
        'invalid path parameter',
        z.flattenError(params.error).fieldErrors,
      )
    }

    const patient = await db
      .selectFrom('patients')
      .select('id')
      .where('id', '=', params.data.patientId)
      .executeTakeFirst()

    if (!patient) {
      throw new ApiError(404, 'NOT_FOUND', 'patient not found')
    }

    res.json([])
  })

  app.post('/api/patients/:patientId/orders', async (req, res) => {
    const params = patientIdParam.safeParse(req.params)
    if (!params.success) {
      throw new ApiError(
        400,
        'VALIDATION_FAILED',
        'invalid path parameter',
        z.flattenError(params.error).fieldErrors,
      )
    }

    const patient = await db
      .selectFrom('patients')
      .select('id')
      .where('id', '=', params.data.patientId)
      .executeTakeFirst()

    if (!patient) {
      throw new ApiError(404, 'NOT_FOUND', 'patient not found')
    }

    const body = orderInput.parse(req.body)

    const order = await db
      .insertInto('orders')
      .values({ patient_id: params.data.patientId, message: body.message })
      .returningAll()
      .executeTakeFirstOrThrow()

    res.status(201).json({
      id: order.id,
      patientId: order.patient_id,
      message: order.message,
    })
  })

  // Express 5 會把 async handler 回傳的 rejected promise 轉到這裡，
  // 所以 handler 不需要各自包 try/catch。
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json({
        code: err.code,
        message: err.message,
        data: err.data,
      })
      return
    }

    next(err)
  })

  return app
}
