import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
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
      <Typography color="text.secondary" sx={{ py: 2 }}>
        尚未有醫囑
      </Typography>
    )
  }

  return (
    <List>
      {orders.map((order) => (
        <ListItemButton key={order.id} onClick={() => onSelect(order)}>
          <ListItemText primary={order.message} />
        </ListItemButton>
      ))}
    </List>
  )
}
