import { useEffect, useState } from 'react'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import IconButton from '@mui/material/IconButton'

interface Patient {
  id: number
  name: string
}

interface Order {
  id: number
  patientId: number
  message: string
}

/**
 * 依契約的 code 決定要給使用者看什麼。
 *
 * 契約明寫回應裡的 message 是英文、寫給開發者與紀錄檔看的，呼叫端不得
 * 直接顯示給使用者——要顯示什麼由呼叫端自行決定，這裡就是那個決定。
 */
function messageFor(code: string): string {
  switch (code) {
    case 'VALIDATION_FAILED':
      return '醫囑內容不能是空白'
    case 'NOT_FOUND':
      return '這筆資料已經不存在，請重新整理'
    default:
      return '儲存失敗，請稍後再試'
  }
}

/**
 * 正在編輯中的內容。id 為 null 代表新增一筆，有值代表在改哪一筆——
 * 兩種情況共用同一個輸入欄位與儲存按鈕，因為對使用者來說是同一件事。
 */
interface Draft {
  id: number | null
  message: string
}

function OrderDialog({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetch(`/api/patients/${patient.id}/orders`)
      .then((res) => res.json())
      .then((data: Order[]) => {
        if (!cancelled) setOrders(data)
      })

    return () => {
      cancelled = true
    }
  }, [patient.id])

  // 兩支端點都承諾回傳處理完的那筆醫囑，那份資料就是權威的，不必再打一次
  // GET。新增的接到尾端、改寫的原地替換——兩者都是契約明寫的行為。
  const save = async ({ id, message }: Draft) => {
    const res =
      id === null
        ? await fetch(`/api/patients/${patient.id}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          })
        : await fetch(`/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          })

    if (!res.ok) {
      const failure: { code: string } = await res.json()
      setError(messageFor(failure.code))
      return
    }

    const saved: Order = await res.json()

    setOrders((current) =>
      id === null
        ? [...current, saved]
        : current.map((order) => (order.id === id ? saved : order)),
    )
    setDraft(null)
    setError(null)
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{patient.name}</span>
          {/* 圖示按鈕沒有文字內容，aria-label 是螢幕閱讀器唯一的線索。 */}
          <IconButton aria-label="新增醫囑" onClick={() => {
              setDraft({ id: null, message: '' })
              setError(null)
            }}>
            <AddIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {orders.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            尚未有醫囑
          </Typography>
        ) : (
          <List>
            {orders.map((order) => (
              <ListItemButton
                key={order.id}
                onClick={() => {
                  setDraft({ id: order.id, message: order.message })
                  setError(null)
                }}
              >
                <ListItemText primary={order.message} />
              </ListItemButton>
            ))}
          </List>
        )}

        {draft !== null && (
          <Stack spacing={1}>
            <TextField
              label="醫囑內容"
              value={draft.message}
              onChange={(event) => setDraft({ ...draft, message: event.target.value })}
              fullWidth
              multiline
              autoFocus
            />
            {error && (
              <Typography color="error" role="alert">
                {error}
              </Typography>
            )}
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => void save(draft)}>
                儲存
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetch('/api/patients')
      .then((res) => res.json())
      .then((data: Patient[]) => {
        if (!cancelled) setPatients(data)
      })

    // component 在請求回來之前被移除時不要再設 state。
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Container maxWidth="sm">
      <Typography variant="h5" component="h1" sx={{ my: 3 }}>
        住民醫囑管理
      </Typography>

      <List>
        {patients.map((patient) => (
          <ListItemButton key={patient.id} onClick={() => setSelected(patient)}>
            <ListItemText primary={patient.name} />
          </ListItemButton>
        ))}
      </List>

      {/* 掛載時機由 selected 決定，這樣切換住民時 OrderDialog 會重新掛載、
          醫囑不會殘留上一位的。 */}
      {selected && <OrderDialog patient={selected} onClose={() => setSelected(null)} />}
    </Container>
  )
}
