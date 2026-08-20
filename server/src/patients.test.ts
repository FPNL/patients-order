import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app'

describe('GET /api/patients', () => {
  // 計畫：在 createApp() 裡加一條 app.get('/api/patients', ...)，
  // 回 res.json([])。這一顆只逼出「這條路由存在且回 JSON 陣列」，
  // 不碰資料庫——真正的住民資料由下一顆（回傳 5 位住民）逼出來。
  //
  // 這裡刻意不斷言 body 等於 []，而是只斷言它是陣列：斷言 [] 的話，
  // 下一顆讓它回真資料時這顆就會變紅，等於用一個註定要被推翻的
  // 斷言把自己綁住。
  it('回 200，body 是 JSON 陣列', async () => {
    const res = await request(createApp()).get('/api/patients')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
