import { describe, expect, it } from 'vitest'
import { parseCliArgs } from './cli'

// 打算怎麼讓它變綠：新增 src/cli.ts，export 一個
// `parseCliArgs(argv: string[]): { conf: string }`。實作是呼叫 node:util 的
// parseArgs（`args: argv`、`options: { conf: { type: 'string' } }`、
// `strict: true`），把 `values.conf` 包成 `{ conf }` 回傳。
//
// 這一步只服務這顆測試：不處理缺 --conf、不處理不認得的選項、不定義
// CliError——那些是後面各自的循環。所以 `values.conf` 為 undefined 時要怎麼
// 辦，這一輪不寫，先用 non-null assertion 讓型別過。
//
// 模組還不存在，import 失敗就是這顆的紅燈。
describe('parseCliArgs', () => {
  it('把 --conf 的值當成設定檔路徑回傳', () => {
    expect(parseCliArgs(['--conf', '/etc/app/config.json'])).toEqual({
      conf: '/etc/app/config.json',
    })
  })
})
