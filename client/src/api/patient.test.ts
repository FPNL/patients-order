import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { listPatients } from './patient'
import { server } from '../test/msw-server'

describe('listPatients', () => {
  it('打 GET /api/patients 並原樣回傳，不重新排序', async () => {
    // 契約承諾依 id 由小到大，前端不該再排一次——這裡刻意回一個不照 id
    // 排的陣列，如果實作偷排過，順序就會跟斷言不同。
    server.use(
      http.get('/api/patients', () =>
        HttpResponse.json([
          { id: 3, name: '志明' },
          { id: 1, name: '小民' },
        ]),
      ),
    )

    await expect(listPatients()).resolves.toEqual([
      { id: 3, name: '志明' },
      { id: 1, name: '小民' },
    ])
  })
})
