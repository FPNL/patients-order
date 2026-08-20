import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('醫囑 Dialog', () => {
  // 計畫：
  // 1. App 用 useState 記住「目前選到的住民」，一開始是 null。
  // 2. ListItemButton 的 onClick 把該住民設進去。
  // 3. 選到的住民不是 null 時渲染 MUI Dialog，open 由它是否為 null 決定。
  // 4. Dialog 內用另一個 useEffect（依賴選到的住民 id）打
  //    GET /api/patients/:id/orders，把醫囑用 List / ListItem 列出來。
  //
  // 用 within(dialog) 限定搜尋範圍：住民姓名同時出現在背景清單與 Dialog
  // 標題時，不限定範圍的查詢會抓到兩個而變得沒有意義。
  //
  // handler 裡斷言 patientId 是 '2'：確保打的是被點到那位住民的醫囑，
  // 而不是永遠打第一位。少了這行，把 id 寫死成 1 的實作也會通過。
  //
  // 斷言醫囑的順序而不只是存在：契約承諾依建立時間由舊到新，後端那邊有
  // 測試守著，前端這邊要確保拿到之後沒有被重新排過。
  it('點擊住民後開啟 Dialog 並列出該住民的醫囑', async () => {
    server.use(
      http.get('/api/patients', () => HttpResponse.json(patients)),
      http.get('/api/patients/:patientId/orders', ({ params }) => {
        expect(params.patientId).toBe('2')
        return HttpResponse.json([
          { id: 7, patientId: 2, message: '超過120請施打8u' },
          { id: 9, patientId: 2, message: '血壓每日量兩次' },
        ])
      }),
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '阿珠' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('阿珠')).toBeInTheDocument()

    const messages = await within(dialog).findAllByRole('listitem')
    expect(messages.map((item) => item.textContent)).toEqual([
      '超過120請施打8u',
      '血壓每日量兩次',
    ])
  })
})
