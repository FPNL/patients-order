import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderList from './OrderList'

const orders = [
  { id: 7, patientId: 1, message: '第一筆' },
  { id: 9, patientId: 1, message: '第二筆' },
]

describe('OrderList', () => {
  it('原樣呈現傳進來的順序', () => {
    render(<OrderList orders={orders} onSelect={() => {}} />)

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual([
      '第一筆',
      '第二筆',
    ])
  })

  // 契約明寫住民存在但沒有醫囑會回 200 與空陣列，不是 NOT_FOUND。
  // 空陣列要呈現得出來，不能留白讓人以為載入失敗。
  it('沒有醫囑時顯示空狀態而不是留白', () => {
    render(<OrderList orders={[]} onSelect={() => {}} />)

    expect(screen.getByText('尚未有醫囑')).toBeInTheDocument()
  })

  it('點擊時把那筆醫囑交出去', async () => {
    const onSelect = vi.fn()
    render(<OrderList orders={orders} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: '第一筆' }))

    // id 用 7 與 9 這種不連續的值：拿陣列索引當 id 的實作會露餡。
    expect(onSelect).toHaveBeenCalledWith({ id: 7, patientId: 1, message: '第一筆' })
  })
})
