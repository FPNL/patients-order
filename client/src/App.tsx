import { useEffect, useState } from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { listPatients } from './api/patient'
import type { Patient } from './api/types'
import OrderDialog from './components/OrderDialog'
import PatientList from './components/PatientList'

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)

  useEffect(() => {
    let cancelled = false

    void listPatients().then((data) => {
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

      <PatientList patients={patients} onSelect={setSelected} />

      {/* 掛載時機由 selected 決定，這樣切換住民時 OrderDialog 會重新掛載、
          醫囑不會殘留上一位的。 */}
      {selected && <OrderDialog patient={selected} onClose={() => setSelected(null)} />}
    </Container>
  )
}
