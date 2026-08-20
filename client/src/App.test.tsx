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

// App 的責任是組合：把住民接進 PatientList、把被點到的住民接進
// OrderDialog。清單與 Dialog 各自的行為由它們自己的測試守，這裡只驗接線。
describe('App', () => {
  it('把後端回傳的住民列出來，順序與後端一致', async () => {
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

  it('一開始沒有 Dialog', async () => {
    server.use(http.get('/api/patients', () => HttpResponse.json(patients)))

    render(<App />)
    await screen.findByRole('button', { name: '小民' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('點擊住民後開啟該住民的 Dialog', async () => {
    server.use(
      http.get('/api/patients', () => HttpResponse.json(patients)),
      // 打的必須是被點到那位住民的醫囑。刻意點第二位而不是第一位，
      // 把 id 寫死成 1 的接線才會露餡。
      http.get('/api/patients/:patientId/orders', ({ params }) => {
        expect(params.patientId).toBe('2')
        return HttpResponse.json([])
      }),
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: '阿珠' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('阿珠')).toBeInTheDocument()
  })
})
