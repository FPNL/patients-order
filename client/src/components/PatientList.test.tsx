import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PatientList from './PatientList'

const patients = [
  { id: 3, name: '志明' },
  { id: 1, name: '小民' },
]

describe('PatientList', () => {
  // 刻意給一個不照 id 排的陣列：契約承諾後端已經排好，前端再排一次只會
  // 讓兩邊有機會不一致。原樣呈現才是對的。
  it('原樣呈現傳進來的順序，不自己重排', () => {
    render(<PatientList patients={patients} onSelect={() => {}} />)

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual([
      '志明',
      '小民',
    ])
  })

  it('點擊時把那位住民交出去', async () => {
    const onSelect = vi.fn()
    render(<PatientList patients={patients} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: '小民' }))

    // 斷言拿到的是完整的住民物件而不只是 id：上層要用 name 當 Dialog 標題。
    expect(onSelect).toHaveBeenCalledWith({ id: 1, name: '小民' })
  })

  it('沒有住民時不渲染任何項目', () => {
    render(<PatientList patients={[]} onSelect={() => {}} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
