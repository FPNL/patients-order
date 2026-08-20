import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { ApiError, UNEXPECTED_RESPONSE, request, withJsonBody } from './api'
import { server } from '../test/msw-server'

describe('request', () => {
  it('2xx 時回傳解析後的 JSON', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({ ok: true })))

    await expect(request('/api/thing')).resolves.toEqual({ ok: true })
  })

  it('非 2xx 時把契約的錯誤信封轉成 ApiError', async () => {
    server.use(
      http.get('/api/thing', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'invalid request body',
            data: { message: ['Too small: expected string to have >=1 characters'] },
          },
          { status: 400 },
        ),
      ),
    )

    // 用 rejects.toMatchObject 而不是 toThrow：要斷言的是 code 與 data，
    // 不是訊息文字——契約明寫呼叫端不得依賴 message 的文字做判斷。
    await expect(request('/api/thing')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      data: { message: ['Too small: expected string to have >=1 characters'] },
    })
    await expect(request('/api/thing')).rejects.toBeInstanceOf(ApiError)
  })

  it('data 缺席時補成空物件，呼叫端不必檢查存在性', async () => {
    server.use(
      http.get('/api/thing', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'x' }, { status: 404 }),
      ),
    )

    // 不能用 toMatchObject({ data: {} })：它對 undefined 是寬鬆的，
    // 不補預設的實作也會通過。要把 data 取出來嚴格比對。
    const error = await request('/api/thing').catch((err: ApiError) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('NOT_FOUND')
    expect((error as ApiError).data).toEqual({})
  })

  it('回應不是 JSON 時給一個看得懂的 code，而不是解析例外', async () => {
    // 契約說錯誤一律是 JSON，但反向代理或網路層可能插進 HTML 錯誤頁。
    server.use(
      http.get('/api/thing', () => new HttpResponse('<html>502</html>', { status: 502 })),
    )

    await expect(request('/api/thing')).rejects.toMatchObject({
      status: 502,
      code: UNEXPECTED_RESPONSE,
    })
  })

  it('回應是 JSON 但沒有 code 時同樣視為不符契約', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({ oops: 1 }, { status: 500 })))

    await expect(request('/api/thing')).rejects.toMatchObject({ code: UNEXPECTED_RESPONSE })
  })
})

describe('withJsonBody', () => {
  it('帶上 method、Content-Type 與序列化的 body', () => {
    expect(withJsonBody('POST', { message: '超過120請施打8u' })).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"message":"超過120請施打8u"}',
    })
  })
})
