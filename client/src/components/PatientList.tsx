import Avatar from '@mui/material/Avatar'
import List from '@mui/material/List'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineRounded'
import type { Patient } from '../api/types'

interface Props {
  patients: Patient[]
  onSelect: (patient: Patient) => void
}

/**
 * 住民清單。順序原樣呈現後端給的順序——契約承諾依 id 由小到大，
 * 這裡再排一次只會讓兩邊有機會不一致。
 */
export default function PatientList({ patients, onSelect }: Props) {
  return (
    <List disablePadding>
      {patients.map((patient) => (
        <ListItemButton key={patient.id} onClick={() => onSelect(patient)} sx={{ py: 1.25 }}>
          <ListItemAvatar>
            {/* 用圖示而不是姓名首字：首字會被算進按鈕的文字內容，讀起來變成
                「小小民」。 */}
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
              <PersonOutlineIcon />
            </Avatar>
          </ListItemAvatar>

          <ListItemText
            primary={patient.name}
            slotProps={{ primary: { sx: { fontWeight: 500, fontSize: '1rem' } } }}
          />

          <ChevronRightIcon sx={{ color: 'text.secondary' }} />
        </ListItemButton>
      ))}
    </List>
  )
}
