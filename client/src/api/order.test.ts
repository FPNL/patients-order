import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { createOrderForPatient, listOrdersOfPatient, replaceOrder } from './order'
import { server } from '../test/msw-server'

describe('listOrdersOfPatient', () => {
  it('打的是指定住民的醫囑', async () => {
    server.use(
      http.get('/api/patients/:patientId/orders', ({ params }) => {
        expect(params.patientId).toBe('2')
        return HttpResponse.json([{ id: 7, patientId: 2, message: '超過120請施打8u' }])
      }),
    )

    await expect(listOrdersOfPatient(2)).resolves.toEqual([
      { id: 7, patientId: 2, message: '超過120請施打8u' },
    ])
  })
})

describe('createOrderForPatient', () => {
  it('POST 到指定住民底下，body 只帶 message', async () => {
    let body: unknown

    server.use(
      http.post('/api/patients/:patientId/orders', async ({ request, params }) => {
        expect(params.patientId).toBe('2')
        body = await request.json()
        return HttpResponse.json({ id: 8, patientId: 2, message: '新的' }, { status: 201 })
      }),
    )

    await expect(createOrderForPatient(2, '新的')).resolves.toEqual({
      id: 8,
      patientId: 2,
      message: '新的',
    })
    // 多送欄位會被後端的 strict schema 打回 400，所以這裡要斷言完整的 body。
    expect(body).toEqual({ message: '新的' })
  })
})

describe('replaceOrder', () => {
  it('PUT 到 /api/orders/:orderId，body 只帶 message', async () => {
    let body: unknown

    server.use(
      http.put('/api/orders/:orderId', async ({ request, params }) => {
        expect(params.orderId).toBe('7')
        body = await request.json()
        return HttpResponse.json({ id: 7, patientId: 2, message: '改過的' })
      }),
    )

    await expect(replaceOrder(7, '改過的')).resolves.toEqual({
      id: 7,
      patientId: 2,
      message: '改過的',
    })
    expect(body).toEqual({ message: '改過的' })
  })
})
