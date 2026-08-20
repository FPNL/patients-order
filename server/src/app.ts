import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import type { Kysely } from 'kysely'
import { z } from 'zod'
import type { Database } from './db/schema'
import { ApiError } from './errors'

const patientIdParam = z.object({
  patientId: z.coerce.number().int().positive(),
})

const orderIdParam = z.object({
  orderId: z.coerce.number().int().positive(),
})

const orderInput = z
  .object({
    message: z.string().min(1).max(4000),
  })
  .strict()

/**
 * 把 zod 的 issue 攤成契約規定的 data 形狀：`{ 欄位名: [訊息, ...] }`。
 *
 * 不能直接用 z.flattenError()：未知欄位產生的 unrecognized_keys issue
 * 的 path 是空陣列，會被歸到 formErrors，fieldErrors 裡拿不到，data 會
 * 變成空物件、資訊整個掉。這裡改成用 issue.keys 裡的每個欄位名當鍵。
 */
function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}

  const add = (field: string, message: string) => {
    ;(fieldErrors[field] ??= []).push(message)
  }

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) add(key, issue.message)
      continue
    }

    add(String(issue.path[0]), issue.message)
  }

  return fieldErrors
}

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
        toFieldErrors(params.error),
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

    const orders = await db
      .selectFrom('orders')
      .select(['id', 'patient_id', 'message'])
      .where('patient_id', '=', params.data.patientId)
      // 同一個 transaction 裡 now() 回的是 transaction 開始時間，連續新增
      // 的幾筆會拿到完全相同的 created_at，只靠它排序不穩定。id 是遞增的
      // serial，拿來當決勝依據。
      .orderBy('created_at')
      .orderBy('id')
      .execute()

    res.json(
      orders.map((order) => ({
        id: order.id,
        patientId: order.patient_id,
        message: order.message,
      })),
    )
  })

  app.post('/api/patients/:patientId/orders', async (req, res) => {
    const params = patientIdParam.safeParse(req.params)
    if (!params.success) {
      throw new ApiError(
        400,
        'VALIDATION_FAILED',
        'invalid path parameter',
        toFieldErrors(params.error),
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

    const body = orderInput.safeParse(req.body)
    if (!body.success) {
      throw new ApiError(
        400,
        'VALIDATION_FAILED',
        'invalid request body',
        toFieldErrors(body.error),
      )
    }

    const order = await db
      .insertInto('orders')
      .values({ patient_id: params.data.patientId, message: body.data.message })
      .returningAll()
      .executeTakeFirstOrThrow()

    res.status(201).json({
      id: order.id,
      patientId: order.patient_id,
      message: order.message,
    })
  })

  app.put('/api/orders/:orderId', async (req, res) => {
    const params = orderIdParam.safeParse(req.params)
    if (!params.success) {
      throw new ApiError(
        400,
        'VALIDATION_FAILED',
        'invalid path parameter',
        toFieldErrors(params.error),
      )
    }

    const body = orderInput.safeParse(req.body)
    if (!body.success) {
      throw new ApiError(
        400,
        'VALIDATION_FAILED',
        'invalid request body',
        toFieldErrors(body.error),
      )
    }

    const order = await db
      .updateTable('orders')
      .set({ message: body.data.message })
      .where('id', '=', params.data.orderId)
      .returningAll()
      .executeTakeFirstOrThrow()

    res.json({
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
