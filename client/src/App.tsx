import { useEffect, useState } from 'react'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
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

function OrderDialog({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [draft, setDraft] = useState<string | null>(null)

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

  // 契約承諾 POST 會回傳建立好的醫囑，那份資料就是權威的——接到清單尾端
  // 即可（契約也承諾新增的排在最後），不必再打一次 GET。
  const save = async (message: string) => {
    const res = await fetch(`/api/patients/${patient.id}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    const created: Order = await res.json()
    setOrders((current) => [...current, created])
    setDraft(null)
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{patient.name}</span>
          {/* 圖示按鈕沒有文字內容，aria-label 是螢幕閱讀器唯一的線索。 */}
          <IconButton aria-label="新增醫囑" onClick={() => setDraft('')}>
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
              <ListItem key={order.id}>
                <ListItemText primary={order.message} />
              </ListItem>
            ))}
          </List>
        )}

        {draft !== null && (
          <Stack spacing={1}>
            <TextField
              label="醫囑內容"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              fullWidth
              multiline
              autoFocus
            />
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
