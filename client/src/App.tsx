import { useEffect, useState } from 'react'
import Container from '@mui/material/Container'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'

interface Patient {
  id: number
  name: string
}

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([])

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
          <ListItemButton key={patient.id}>
            <ListItemText primary={patient.name} />
          </ListItemButton>
        ))}
      </List>
    </Container>
  )
}
