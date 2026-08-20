import { useEffect, useState } from 'react'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'

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

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{patient.name}</DialogTitle>
      <DialogContent>
        <List>
          {orders.map((order) => (
            <ListItem key={order.id}>
              <ListItemText primary={order.message} />
            </ListItem>
          ))}
        </List>
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
