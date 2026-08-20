import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
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
    // 底色鋪滿整個視窗，卡片才浮得起來——只給 Container 上色會在內容不夠
    // 高時露出白底。
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', py: { xs: 4, sm: 8 } }}>
      <Container maxWidth="sm">
        <Stack spacing={0.5} sx={{ mb: 3, px: 1 }}>
          <Typography variant="h1" component="h1">
            住民醫囑管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            選擇住民以檢視、新增或修改醫囑
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{ borderRadius: 4, border: 1, borderColor: 'divider', p: 1, overflow: 'hidden' }}
        >
          <PatientList patients={patients} onSelect={setSelected} />
        </Paper>
      </Container>

      {/* 掛載時機由 selected 決定，這樣切換住民時 OrderDialog 會重新掛載、
          醫囑不會殘留上一位的。 */}
      {selected && <OrderDialog patient={selected} onClose={() => setSelected(null)} />}
    </Box>
  )
}
