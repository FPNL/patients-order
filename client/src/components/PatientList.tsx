import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
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
    <List>
      {patients.map((patient) => (
        <ListItemButton key={patient.id} onClick={() => onSelect(patient)}>
          <ListItemText primary={patient.name} />
        </ListItemButton>
      ))}
    </List>
  )
}
