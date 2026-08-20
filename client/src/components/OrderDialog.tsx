import { useEffect, useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineRounded'
import { ApiError } from '../api/api'
import { createOrderForPatient, listOrdersOfPatient, replaceOrder } from '../api/order'
import type { Order, Patient } from '../api/types'
import { messageFor } from '../messages'
import OrderEditor from './OrderEditor'
import OrderList from './OrderList'

/**
 * 正在編輯中的內容。`id` 為 null 代表新增一筆，有值代表在改哪一筆——
 * 兩種情況共用同一個輸入區，因為對使用者來說是同一件事。
 */
interface Draft {
  id: number | null
  message: string
}

interface Props {
  patient: Patient
  onClose: () => void
}

export default function OrderDialog({ patient, onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void listOrdersOfPatient(patient.id).then((data) => {
      if (!cancelled) setOrders(data)
    })

    return () => {
      cancelled = true
    }
  }, [patient.id])

  const edit = (next: Draft) => {
    setDraft(next)
    // 上一次的錯誤已經不成立了，留著只會誤導。
    setError(null)
  }

  // 兩支端點都承諾回傳處理完的那筆醫囑，那份資料就是權威的，不必再打一次
  // GET。新增的接到尾端、改寫的原地替換——兩者都是契約明寫的行為。
  const save = async ({ id, message }: Draft) => {
    // 送出的是去掉前後空白的內容，輸入框裡的字不動——使用者打了什麼還
    // 看得到。
    const trimmed = message.trim()

    try {
      const saved =
        id === null
          ? await createOrderForPatient(patient.id, trimmed)
          : await replaceOrder(id, trimmed)

      setOrders((current) =>
        id === null
          ? [...current, saved]
          : current.map((order) => (order.id === id ? saved : order)),
      )
      setDraft(null)
      setError(null)
    } catch (err) {
      // 失敗時不動清單、不收起輸入區、不清掉使用者打的字。
      setError(messageFor(err instanceof ApiError ? err.code : ''))
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle component="div" sx={{ p: 2.5, pb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
            <PersonOutlineIcon />
          </Avatar>

          {/* minWidth: 0 讓長姓名在這個 flex 列裡縮得下去，不會把關閉鈕擠出去。 */}
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h2" component="h2" noWrap>
              {patient.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {orders.length} 則
            </Typography>
          </Stack>

          {/* 圖示按鈕沒有文字內容，aria-label 是螢幕閱讀器唯一的線索。 */}
          <IconButton aria-label="關閉" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 2.5 }}>
        <OrderList
          orders={orders}
          onSelect={(order) => edit({ id: order.id, message: order.message })}
        />

        {draft !== null ? (
          <OrderEditor
            message={draft.message}
            error={error}
            onChange={(message) => setDraft({ ...draft, message })}
            onSave={() => void save(draft)}
          />
        ) : (
          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => edit({ id: null, message: '' })}
            >
              新增醫囑
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
