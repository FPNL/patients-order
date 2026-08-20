import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app'

describe('server 測試骨架', () => {
  it('supertest 可以直接打未 listen 的 app', async () => {
    const res = await request(createApp()).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
