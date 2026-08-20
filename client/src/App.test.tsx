import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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

    // 醫囑本身是可點擊的（下一顆會用到），所以查的是清單裡的 button，
    // 並限定在 list 內，避免把「新增醫囑」按鈕算進來。
    const list = await within(dialog).findByRole('list')
    expect(within(list).getAllByRole('button').map((item) => item.textContent)).toEqual([
      '超過120請施打8u',
      '血壓每日量兩次',
    ])
  })

  // 計畫：OrderDialog 在 orders 是空陣列時，改渲染一段說明文字而不是空的
  // List。文案用「尚未有醫囑」。
  //
  // 這顆守的是契約那條區分：住民存在但沒有醫囑會回 200 與空陣列，不是
  // NOT_FOUND。前端拿到空陣列時要呈現「這位住民還沒有醫囑」，而不是留白
  // 讓人以為載入失敗。
  //
  // 這裡刻意不斷言「沒有 listitem」——那種否定斷言在畫面還沒載完時也會
  // 通過。改成斷言那句文字真的出現，是一個只有實作對了才會成立的條件。
  it('住民沒有醫囑時顯示空狀態', async () => {
    server.use(
      http.get('/api/patients', () => HttpResponse.json(patients)),
      http.get('/api/patients/:patientId/orders', () => HttpResponse.json([])),
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '小民' }))

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('尚未有醫囑')).toBeInTheDocument()
  })

  // 計畫：
  // 1. DialogTitle 裡放一個 IconButton（MUI 的 AddIcon），用 sx 靠右對齊，
  //    aria-label 設成「新增醫囑」——圖示按鈕沒有文字內容，沒有 aria-label
  //    的話螢幕閱讀器與測試都找不到它。
  // 2. OrderDialog 用 useState 記住「是否正在新增」，按鈕的 onClick 打開。
  // 3. 打開時渲染一個 MUI TextField，label 設成「醫囑內容」。
  //
  // 這顆只到「按鈕在、按下去出現輸入欄位」為止。送出、呼叫 POST、清單更新
  // 都留給下一顆——那些是不同的行為，混在一起這顆紅的時候會分不出是哪裡壞。
  //
  // 用 findByRole('textbox') 而不是找 TextField 的 class：斷言的是使用者
  // 看得到、輔助技術認得的東西，MUI 換 class 名不該讓測試紅。
  it('按下新增按鈕後出現醫囑輸入欄位', async () => {
    server.use(
      http.get('/api/patients', () => HttpResponse.json(patients)),
      http.get('/api/patients/:patientId/orders', () => HttpResponse.json([])),
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '小民' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: '新增醫囑' }))

    expect(await within(dialog).findByRole('textbox', { name: '醫囑內容' })).toBeInTheDocument()
  })

  // 計畫：
  // 1. TextField 旁加一個「儲存」按鈕。
  // 2. 按下去打 POST /api/patients/:id/orders，body 是 { message }。
  // 3. 成功後把回傳的醫囑接到清單尾端（契約承諾新增的排在最後），
  //    並把 draft 設回 null 收起輸入欄位。
  //
  // 不重新打一次 GET 來更新清單：契約承諾 POST 會回傳建立好的醫囑，
  // 那份資料就是權威的，再打一次 GET 是多一次來回。
  //
  // handler 裡斷言 request body 的完整內容：少了它，一個把 message 寫死
  // 或漏傳的實作也會通過。await request.json() 是這顆真正的驗證點。
  it('填入內容送出後打 POST，並把新醫囑接到清單尾端', async () => {
    const existing = { id: 7, patientId: 1, message: '既有的醫囑' }
    let posted: unknown

    server.use(
      http.get('/api/patients', () => HttpResponse.json(patients)),
      http.get('/api/patients/:patientId/orders', () => HttpResponse.json([existing])),
      http.post('/api/patients/:patientId/orders', async ({ request, params }) => {
        expect(params.patientId).toBe('1')
        posted = await request.json()
        return HttpResponse.json(
          { id: 8, patientId: 1, message: '超過120請施打8u' },
          { status: 201 },
        )
      }),
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '小民' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: '新增醫囑' }))
    await userEvent.type(
      await within(dialog).findByRole('textbox', { name: '醫囑內容' }),
      '超過120請施打8u',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: '儲存' }))

    await waitFor(() => expect(posted).toEqual({ message: '超過120請施打8u' }))

    const list = await within(dialog).findByRole('list')
    await waitFor(() =>
      expect(within(list).getAllByRole('button').map((item) => item.textContent)).toEqual([
        '既有的醫囑',
        '超過120請施打8u',
      ]),
    )

    // 存完就收起來，不留著一個裝著舊內容的輸入框。
    expect(within(dialog).queryByRole('textbox', { name: '醫囑內容' })).not.toBeInTheDocument()
  })

  // 計畫：
  // 1. 清單裡的每筆醫囑從 ListItem 改成 ListItemButton，點擊把 draft 設成
  //    「正在編輯這筆、內容是它現在的 message」。
  // 2. draft 因此要從 string | null 變成
  //    { id: number | null; message: string } | null——id 是 null 代表新增，
  //    有值代表編輯哪一筆。兩種情況共用同一個輸入欄位與儲存按鈕。
  // 3. 儲存時依 id 決定打 POST 還是 PUT /api/orders/:orderId。
  // 4. PUT 成功後用回傳的醫囑替換清單裡的那一筆，位置不變——契約明寫改寫
  //    內容不會改變它在清單中的位置。
  //
  // 斷言改寫後的清單「順序不變」而不只是內容對：把改過的那筆搬到尾端是
  // 很容易犯的錯（新增的邏輯就是接到尾端），順序不變才是契約承諾的。
  it('點既有醫囑可編輯，儲存後打 PUT 且位置不變', async () => {
    let putBody: unknown
    let putUrl: string | undefined

    server.use(
      http.get('/api/patients', () => HttpResponse.json(patients)),
      http.get('/api/patients/:patientId/orders', () =>
        HttpResponse.json([
          { id: 7, patientId: 1, message: '第一筆' },
          { id: 9, patientId: 1, message: '第二筆' },
        ]),
      ),
      http.put('/api/orders/:orderId', async ({ request, params }) => {
        putUrl = String(params.orderId)
        putBody = await request.json()
        return HttpResponse.json({ id: 7, patientId: 1, message: '改過的第一筆' })
      }),
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '小民' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(await within(dialog).findByRole('button', { name: '第一筆' }))

    // 編輯時輸入欄位要帶著原本的內容，不是空白——不然使用者得整段重打。
    const input = await within(dialog).findByRole('textbox', { name: '醫囑內容' })
    expect(input).toHaveValue('第一筆')

    await userEvent.clear(input)
    await userEvent.type(input, '改過的第一筆')
    await userEvent.click(within(dialog).getByRole('button', { name: '儲存' }))

    await waitFor(() => expect(putBody).toEqual({ message: '改過的第一筆' }))
    expect(putUrl).toBe('7')

    // 限定在醫囑清單裡找，不然「新增醫囑」按鈕也會被算進來，斷言就跟
    // 版面順序綁在一起了。
    const list = within(dialog).getByRole('list')
    expect(within(list).getAllByRole('button').map((item) => item.textContent)).toEqual([
      '改過的第一筆',
      '第二筆',
    ])
  })
})
