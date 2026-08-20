import type { RequestHandler } from 'express'
import type { Kysely } from 'kysely'
import { z } from 'zod'
import type { Database } from '../db/schema'
import { ApiError, parseBody, parsePathParams } from './api'

/** 契約的 listOrdersOfPatient：回傳該住民的醫囑，依建立時間由舊到新。 */
export function listOrdersOfPatientHandler(db: Kysely<Database>): RequestHandler {
  return async (req, res) => {
    const patientIdParam = z.object({
      patientId: z.coerce.number().int().positive(),
    })

    const { patientId } = parsePathParams(patientIdParam, req.params)

    const patient = await db
      .selectFrom('patients')
      .select('id')
      .where('id', '=', patientId)
      .executeTakeFirst()

    if (!patient) {
      throw new ApiError(404, 'NOT_FOUND', 'patient not found')
    }

    const orders = await db
      .selectFrom('orders')
      .select(['id', 'patient_id', 'message'])
      .where('patient_id', '=', patientId)
      // created_at 相同時（例如同一毫秒內連續新增）需要一個穩定的決勝
      // 依據，id 是遞增的 serial。
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
  }
}

// strict()：未定義的欄位不會被剝掉，整個請求以 VALIDATION_FAILED 拒絕。
// 呼叫端拼錯欄位名時應該馬上知道，而不是以為存成功了。
const ReqCreateOrderForPatient = z
  .object({
    message: z.string().min(1).max(4000),
  })
  .strict()

/** 契約的 createOrderForPatient：為該住民新增一筆醫囑。 */
export function createOrderForPatientHandler(db: Kysely<Database>): RequestHandler {
  return async (req, res) => {
    const patientIdParam = z.object({
      patientId: z.coerce.number().int().positive(),
    })

    const { patientId } = parsePathParams(patientIdParam, req.params)

    const patient = await db
      .selectFrom('patients')
      .select('id')
      .where('id', '=', patientId)
      .executeTakeFirst()

    if (!patient) {
      throw new ApiError(404, 'NOT_FOUND', 'patient not found')
    }

    const { message } = parseBody(ReqCreateOrderForPatient, req.body)

    const order = await db
      .insertInto('orders')
      .values({ patient_id: patientId, message })
      .returningAll()
      .executeTakeFirstOrThrow()

    res.status(201).json({
      id: order.id,
      patientId: order.patient_id,
      message: order.message,
    })
  }
}

// 目前與 ReqCreateOrderForPatient 內容相同，但刻意分開：兩支端點的 body
// 是兩份各自獨立的契約，其中一支日後放寬或收緊時不該連帶影響另一支。
const ReqReplaceOrder = z
  .object({
    message: z.string().min(1).max(4000),
  })
  .strict()

/** 契約的 replaceOrder：以請求內容取代該醫囑的內容。 */
export function replaceOrderHandler(db: Kysely<Database>): RequestHandler {
  return async (req, res) => {
    const orderIdParam = z.object({
      orderId: z.coerce.number().int().positive(),
    })

    const { orderId } = parsePathParams(orderIdParam, req.params)
    const { message } = parseBody(ReqReplaceOrder, req.body)

    const order = await db
      .updateTable('orders')
      .set({ message })
      .where('id', '=', orderId)
      .returningAll()
      .executeTakeFirst()

    if (!order) {
      throw new ApiError(404, 'NOT_FOUND', 'order not found')
    }

    res.json({
      id: order.id,
      patientId: order.patient_id,
      message: order.message,
    })
  }
}
