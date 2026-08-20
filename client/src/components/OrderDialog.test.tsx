import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import OrderDialog from './OrderDialog'
import { server } from '../test/msw-server'

const patient = { id: 1, name: '小民' }

const renderDialog = () => render(<OrderDialog patient={patient} onClose={() => {}} />)

describe('OrderDialog 讀取醫囑', () => {
  it('列出該住民的醫囑，順序與後端一致', async () => {
    server.use(
      http.get('/api/patients/:patientId/orders', ({ params }) => {
        expect(params.patientId).toBe('1')
        return HttpResponse.json([
          { id: 7, patientId: 1, message: '超過120請施打8u' },
          { id: 9, patientId: 1, message: '血壓每日量兩次' },
        ])
      }),
    )

    renderDialog()

    const list = await screen.findByRole('list')
    expect(within(list).getAllByRole('button').map((item) => item.textContent)).toEqual([
      '超過120請施打8u',
      '血壓每日量兩次',
    ])
  })

  // 計畫：把 DialogTitle 裡寫死的副標「醫囑」換成 `${orders.length} 則`。
  // orders 已經在 state 裡，不必多打一支 API 問筆數。
  //
  // 現在那行永遠是「醫囑」——Dialog 裡整片都是醫囑，那行字沒有資訊量。
  // 同樣一行高度改放筆數，才是使用者在標題列讀得到的東西。
  it('標題列顯示醫囑筆數', async () => {
    server.use(
      http.get('/api/patients/:patientId/orders', () =>
        HttpResponse.json([
          { id: 7, patientId: 1, message: '超過120請施打8u' },
          { id: 9, patientId: 1, message: '血壓每日量兩次' },
        ]),
      ),
    )

    renderDialog()

    expect(await screen.findByText('2 則')).toBeInTheDocument()
  })

  it('沒有醫囑時顯示空狀態', async () => {
    server.use(http.get('/api/patients/:patientId/orders', () => HttpResponse.json([])))

    renderDialog()

    expect(await screen.findByText('尚未有醫囑')).toBeInTheDocument()
  })
})

describe('OrderDialog 新增醫囑', () => {
  it('按下新增按鈕後才出現輸入欄位', async () => {
    server.use(http.get('/api/patients/:patientId/orders', () => HttpResponse.json([])))

    renderDialog()
    await screen.findByText('尚未有醫囑')

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '新增醫囑' }))

    expect(await screen.findByRole('textbox', { name: '醫囑內容' })).toBeInTheDocument()
  })

  it('送出後打 POST，並把新醫囑接到清單尾端', async () => {
    let posted: unknown

    server.use(
      http.get('/api/patients/:patientId/orders', () =>
        HttpResponse.json([{ id: 7, patientId: 1, message: '既有的醫囑' }]),
      ),
      http.post('/api/patients/:patientId/orders', async ({ request, params }) => {
        expect(params.patientId).toBe('1')
        posted = await request.json()
        return HttpResponse.json(
          { id: 8, patientId: 1, message: '超過120請施打8u' },
          { status: 201 },
        )
      }),
    )

    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: '新增醫囑' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: '醫囑內容' }),
      '超過120請施打8u',
    )
    await userEvent.click(screen.getByRole('button', { name: '儲存' }))

    // 多送欄位會被後端的 strict schema 打回 400，所以斷言完整的 body。
    await waitFor(() => expect(posted).toEqual({ message: '超過120請施打8u' }))

    const list = screen.getByRole('list')
    await waitFor(() =>
      expect(within(list).getAllByRole('button').map((item) => item.textContent)).toEqual([
        '既有的醫囑',
        '超過120請施打8u',
      ]),
    )

    // 存完就收起來，不留著一個裝著舊內容的輸入框。
    expect(screen.queryByRole('textbox', { name: '醫囑內容' })).not.toBeInTheDocument()
  })

  // 計畫：在 OrderDialog 的 save 裡把送出的內容換成 message.trim()——
  // 輸入框裡的字不動（使用者打了什麼還看得到），只有交給 API 的那份被
  // 去空白。
  //
  // 現在送出的是輸入框的原樣內容，後端會把只有空白的那種擋成 400；前後
  // 帶空白的則是存進去之後才由後端 trim，使用者送出的與存下來的不一致。
  //
  // 斷言的是實際送出去的 body 而不是畫面：trim 發生在送出的那一刻，
  // 畫面上的輸入框本來就不該被動。
  it('送出前去除前後空白', async () => {
    let posted: unknown

    server.use(
      http.get('/api/patients/:patientId/orders', () => HttpResponse.json([])),
      http.post('/api/patients/:patientId/orders', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json(
          { id: 8, patientId: 1, message: '超過120請施打8u' },
          { status: 201 },
        )
      }),
    )

    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: '新增醫囑' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: '醫囑內容' }),
      '  超過120請施打8u  ',
    )
    await userEvent.click(screen.getByRole('button', { name: '儲存' }))

    await waitFor(() => expect(posted).toEqual({ message: '超過120請施打8u' }))
  })
})

describe('OrderDialog 編輯醫囑', () => {
  it('點既有醫囑可編輯，儲存後打 PUT 且位置不變', async () => {
    let putBody: unknown
    let putId: string | undefined

    server.use(
      http.get('/api/patients/:patientId/orders', () =>
        HttpResponse.json([
          { id: 7, patientId: 1, message: '第一筆' },
          { id: 9, patientId: 1, message: '第二筆' },
        ]),
      ),
      http.put('/api/orders/:orderId', async ({ request, params }) => {
        putId = String(params.orderId)
        putBody = await request.json()
        return HttpResponse.json({ id: 7, patientId: 1, message: '改過的第一筆' })
      }),
    )

    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: '第一筆' }))

    // 編輯時輸入欄位要帶著原本的內容，不然使用者得整段重打。
    const input = await screen.findByRole('textbox', { name: '醫囑內容' })
    expect(input).toHaveValue('第一筆')

    await userEvent.clear(input)
    await userEvent.type(input, '改過的第一筆')
    await userEvent.click(screen.getByRole('button', { name: '儲存' }))

    await waitFor(() => expect(putBody).toEqual({ message: '改過的第一筆' }))
    // id 用 7 與 9 這種不連續的值：拿陣列索引當 id 的實作會露餡。
    expect(putId).toBe('7')

    // 契約明寫改寫內容不會改變它在清單中的位置，把改過的搬到尾端要能紅。
    const list = screen.getByRole('list')
    await waitFor(() =>
      expect(within(list).getAllByRole('button').map((item) => item.textContent)).toEqual([
        '改過的第一筆',
        '第二筆',
      ]),
    )
  })

  // 計畫：DialogContent 改成二選一——draft 為 null 就渲染 OrderList 與
  // 「新增醫囑」按鈕，不為 null 就只渲染 OrderEditor。兩者不再同時出現。
  //
  // 現在點下醫囑後，清單留在原地、編輯框長在它下面，同一則醫囑在畫面上
  // 出現兩次，使用者得自己對照哪一份才是正在改的。
  //
  // 斷言「清單不在畫面上」而不是斷言某個 class／state：使用者看到的就是
  // 上面那一整排唯讀的醫囑不見了。
  it('點醫囑後清單換成編輯畫面', async () => {
    server.use(
      http.get('/api/patients/:patientId/orders', () =>
        HttpResponse.json([
          { id: 7, patientId: 1, message: '第一筆' },
          { id: 9, patientId: 1, message: '第二筆' },
        ]),
      ),
    )

    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: '第一筆' }))

    expect(await screen.findByRole('textbox', { name: '醫囑內容' })).toHaveValue('第一筆')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})

describe('OrderDialog 儲存失敗', () => {
  it('顯示錯誤、保留輸入內容且留在編輯畫面', async () => {
    server.use(
      http.get('/api/patients/:patientId/orders', () =>
        HttpResponse.json([{ id: 7, patientId: 1, message: '既有的醫囑' }]),
      ),
      http.post('/api/patients/:patientId/orders', () =>
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

    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: '新增醫囑' }))
    // 純空白會通過前端、被後端擋下——契約明寫前後空白不會被去除。
    await userEvent.type(await screen.findByRole('textbox', { name: '醫囑內容' }), '   ')
    await userEvent.click(screen.getByRole('button', { name: '儲存' }))

    // 顯示的是依 code 決定的中文，不是回應裡的英文 message。
    expect(await screen.findByRole('alert')).toHaveTextContent('醫囑內容不能是空白')

    expect(screen.getByRole('textbox', { name: '醫囑內容' })).toHaveValue('   ')

    // 兩段式之下，編輯畫面裡本來就沒有清單，這裡改為斷言「沒有被丟回
    // 清單」——存失敗時使用者要留在原地繼續改，不是回到上一頁重來。
    // 「清單內容沒有被動到」由返回清單那顆測試接手。
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('重新開啟輸入區時清掉上一次的錯誤', async () => {
    server.use(
      http.get('/api/patients/:patientId/orders', () =>
        HttpResponse.json([{ id: 7, patientId: 1, message: '既有的醫囑' }]),
      ),
      http.post('/api/patients/:patientId/orders', () =>
        HttpResponse.json({ code: 'VALIDATION_FAILED', message: 'x', data: {} }, { status: 400 }),
      ),
    )

    renderDialog()
    await userEvent.click(await screen.findByRole('button', { name: '新增醫囑' }))
    await userEvent.type(await screen.findByRole('textbox', { name: '醫囑內容' }), '   ')
    await userEvent.click(screen.getByRole('button', { name: '儲存' }))
    await screen.findByRole('alert')

    // 改去點既有的醫囑：上一則錯誤已經不成立了，留著只會誤導。
    await userEvent.click(screen.getByRole('button', { name: '既有的醫囑' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
