import type { RequestHandler } from 'express'
import type { Kysely } from 'kysely'
import { z } from 'zod'
import type { Database } from '../db/schema'
import { ApiError, toFieldErrors } from './api'

// 路徑參數永遠是字串，所以要 coerce 之後才驗得了數值條件。
const patientIdParam = z.object({
  patientId: z.coerce.number().int().positive(),
})

const orderIdParam = z.object({
  orderId: z.coerce.number().int().positive(),
})

// strict()：未定義的欄位不會被剝掉，整個請求以 VALIDATION_FAILED 拒絕。
// 呼叫端拼錯欄位名時應該馬上知道，而不是以為存成功了。
const orderInput = z
  .object({
    message: z.string().min(1).max(4000),
  })
  .strict()

type OrderRow = { id: number; patient_id: number; message: string }

const toOrder = (row: OrderRow) => ({
  id: row.id,
  patientId: row.patient_id,
  message: row.message,
})

function parsePathParams<T extends z.ZodType>(schema: T, params: unknown): z.infer<T> {
  const parsed = schema.safeParse(params)
  if (!parsed.success) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'invalid path parameter',
      toFieldErrors(parsed.error),
    )
  }
  return parsed.data
}

function parseMessage(body: unknown): string {
  const parsed = orderInput.safeParse(body)
  if (!parsed.success) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'invalid request body',
      toFieldErrors(parsed.error),
    )
  }
  return parsed.data.message
}

async function requirePatient(db: Kysely<Database>, patientId: number): Promise<void> {
  const patient = await db
    .selectFrom('patients')
    .select('id')
    .where('id', '=', patientId)
    .executeTakeFirst()

  if (!patient) {
    throw new ApiError(404, 'NOT_FOUND', 'patient not found')
  }
}

/** 契約的 listOrdersOfPatientHandler：回傳該住民的醫囑，依建立時間由舊到新。 */
export function listOrdersOfPatientHandler(db: Kysely<Database>): RequestHandler {
  return async (req, res) => {
    const { patientId } = parsePathParams(patientIdParam, req.params)
    await requirePatient(db, patientId)

    const orders = await db
      .selectFrom('orders')
      .select(['id', 'patient_id', 'message'])
      .where('patient_id', '=', patientId)
      // created_at 相同時（例如同一毫秒內連續新增）需要一個穩定的決勝
      // 依據，id 是遞增的 serial。
      .orderBy('created_at')
      .orderBy('id')
      .execute()

    res.json(orders.map(toOrder))
  }
}

/** 契約的 createOrderForPatientHandler：為該住民新增一筆醫囑。 */
export function createOrderForPatientHandler(db: Kysely<Database>): RequestHandler {
  return async (req, res) => {
    const { patientId } = parsePathParams(patientIdParam, req.params)
    await requirePatient(db, patientId)
    const message = parseMessage(req.body)

    const order = await db
      .insertInto('orders')
      .values({ patient_id: patientId, message })
      .returningAll()
      .executeTakeFirstOrThrow()

    res.status(201).json(toOrder(order))
  }
}

/** 契約的 replaceOrderHandler：以請求內容取代該醫囑的內容。 */
export function replaceOrderHandler(db: Kysely<Database>): RequestHandler {
  return async (req, res) => {
    const { orderId } = parsePathParams(orderIdParam, req.params)
    const message = parseMessage(req.body)

    const order = await db
      .updateTable('orders')
      .set({ message })
      .where('id', '=', orderId)
      .returningAll()
      .executeTakeFirst()

    if (!order) {
      throw new ApiError(404, 'NOT_FOUND', 'order not found')
    }

    res.json(toOrder(order))
  }
}
