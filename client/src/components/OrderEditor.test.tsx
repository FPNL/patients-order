import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderEditor from './OrderEditor'

describe('OrderEditor', () => {
  it('帶著傳進來的內容，編輯時不必整段重打', () => {
    render(<OrderEditor message="原本的內容" error={null} onChange={() => {}} onSave={() => {}} />)

    expect(screen.getByRole('textbox', { name: '醫囑內容' })).toHaveValue('原本的內容')
  })

  it('打字時把新內容交出去', async () => {
    const onChange = vi.fn()
    render(<OrderEditor message="" error={null} onChange={onChange} onSave={() => {}} />)

    await userEvent.type(screen.getByRole('textbox', { name: '醫囑內容' }), 'ab')

    // 每個字元一次呼叫，最後一次帶的是當下的完整內容。這個 component 不
    // 自己保存狀態，所以 message 停在 ''，第二次仍然是 'b'。
    expect(onChange).toHaveBeenNthCalledWith(1, 'a')
    expect(onChange).toHaveBeenNthCalledWith(2, 'b')
  })

  it('按下儲存時通知上層', async () => {
    const onSave = vi.fn()
    render(<OrderEditor message="x" error={null} onChange={() => {}} onSave={onSave} />)

    await userEvent.click(screen.getByRole('button', { name: '儲存' }))

    expect(onSave).toHaveBeenCalledOnce()
  })

  it('沒有錯誤時不佔位置', () => {
    render(<OrderEditor message="x" error={null} onChange={() => {}} onSave={() => {}} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // role="alert" 讓螢幕閱讀器在錯誤出現時主動唸出來，這是實質的無障礙
  // 需求，不是為了測試好找。
  it('有錯誤時以 alert 的角色顯示', () => {
    render(
      <OrderEditor message="x" error="醫囑內容不能是空白" onChange={() => {}} onSave={() => {}} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('醫囑內容不能是空白')
  })
})
