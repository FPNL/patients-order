import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import type { Order } from '../api/types'

interface Props {
  orders: Order[]
  onSelect: (order: Order) => void
}

/**
 * 醫囑清單。空陣列代表「這位住民還沒有醫囑」，不是載入失敗——契約明寫
 * 住民存在但沒有醫囑會回 200 與空陣列，所以要呈現得出來而不是留白。
 */
export default function OrderList({ orders, onSelect }: Props) {
  if (orders.length === 0) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'center', py: 5, color: 'text.secondary' }}>
        <DescriptionOutlinedIcon fontSize="large" />
        <Typography color="text.secondary">尚未有醫囑</Typography>
      </Stack>
    )
  }

  return (
    <List disablePadding sx={{ display: 'grid', gap: 1 }}>
      {orders.map((order) => (
        <ListItemButton
          key={order.id}
          onClick={() => onSelect(order)}
          sx={{
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            alignItems: 'flex-start',
            gap: 1,
            py: 1.5,
          }}
        >
          {/* 醫囑可能很長，允許換行；截斷會讓使用者得點開才知道內容。 */}
          <ListItemText
            primary={order.message}
            slotProps={{ primary: { sx: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } } }}
          />

          {/* 鉛筆圖示說明點下去是編輯而不是展開。 */}
          <EditOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20, mt: 0.25 }} />
        </ListItemButton>
      ))}
    </List>
  )
}
