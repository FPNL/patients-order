import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 用子行程跑真正的進入點，測的是「啟動服務的人在終端機看到什麼」。
 *
 * 不能改成 import main.ts：它是有副作用的頂層腳本，import 就會連資料庫、
 * 開 port、呼叫 process.exit。
 *
 * 這裡涵蓋的四種失敗都在碰資料庫之前就結束，所以不需要 PostgreSQL。
 */
async function runMain(args: string[]): Promise<{ code: number; stderr: string }> {
  try {
    await execFileAsync('npx', ['tsx', 'src/main.ts', ...args], { cwd: serverRoot })
    return { code: 0, stderr: '' }
  } catch (err) {
    const failure = err as { code?: number; stderr?: string }
    return { code: failure.code ?? -1, stderr: failure.stderr ?? '' }
  }
}

const writeTemp = (contents: string): string => {
  const path = join(mkdtempSync(join(tmpdir(), 'main-test-')), 'config.json')
  writeFileSync(path, contents)
  return path
}

describe('啟動時的設定錯誤', () => {
  it.each([
    ['沒給 --conf', () => [], 'missing required option --conf'],
    ['檔案讀不到', () => ['--conf', '/no/such/file.json'], 'cannot read /no/such/file.json'],
    ['內容不是合法 JSON', () => ['--conf', writeTemp('{ 壞掉')], 'is not valid JSON'],
    [
      '內容不合規格',
      () => ['--conf', writeTemp('{"database":{"url":"x"},"typo":1}')],
      'Unrecognized key: "typo"',
    ],
    // parseArgs 丟的是帶 ERR_PARSE_ARGS_ 前綴的 TypeError，不是 ConfigError。
    // 少了 isCliUsageError 這條就會吐堆疊追蹤。
    [
      '不認得的選項',
      () => ['--conf', writeTemp('{"database":{"url":"x"}}'), '--typo', '1'],
      "Unknown option '--typo'",
    ],
  ])('%s：以 1 結束並說明原因', async (_label, args, expected) => {
    const { code, stderr } = await runMain(args())

    expect(code).toBe(1)
    expect(stderr).toContain(expected)

    // 這才是這組測試真正的價值：看的人是啟動服務的人，不該收到堆疊追蹤。
    expect(stderr).not.toContain('    at ')
  }, 30_000)
})
