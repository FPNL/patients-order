import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import App from './App'
import { server } from './test/msw-server'

const patients = [
  { id: 1, name: '小民' },
  { id: 2, name: '阿珠' },
  { id: 3, name: '志明' },
  { id: 4, name: '春嬌' },
  { id: 5, name: '阿英' },
]

describe('住民清單', () => {
  it('前端測試骨架：渲染得出 MUI 元件', () => {
    server.use(http.get('/api/patients', () => HttpResponse.json([])))

    render(<App />)

    expect(screen.getByRole('heading', { name: '住民醫囑管理' })).toBeInTheDocument()
  })

  // 計畫：
  // 1. App 用 useEffect 打 GET /api/patients，useState 存結果。
  // 2. 用 MUI 的 List / ListItemButton / ListItemText 把姓名列出來。
  //    用 ListItemButton 是因為下一顆要點擊開 Dialog，它本身就是 button
  //    role，測試才找得到、鍵盤也才操作得了。
  //
  // 斷言的是使用者看得到的東西（螢幕上的姓名與順序），不是 component 內部
  // 的 state——這是 RTL 的用法，也讓實作怎麼拆 component 保有自由。
  //
  // 順序照契約承諾的「依 id 由小到大」，所以直接比對整個陣列而不是逐一
  // 檢查存在——順序錯掉時要能紅。
  it('列出後端回傳的住民，順序與後端一致', async () => {
    server.use(http.get('/api/patients', () => HttpResponse.json(patients)))

    render(<App />)

    const items = await screen.findAllByRole('button')
    expect(items.map((item) => item.textContent)).toEqual([
      '小民',
      '阿珠',
      '志明',
      '春嬌',
      '阿英',
    ])
  })
})
