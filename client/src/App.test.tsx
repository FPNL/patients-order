import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('前端測試骨架', () => {
  it('React Testing Library 渲染得出 MUI 元件', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '住民醫囑管理' })).toBeInTheDocument()
  })
})
