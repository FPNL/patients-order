import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

interface Props {
  message: string
  error: string | null
  onChange: (message: string) => void
  onSave: () => void
}

/** 新增與編輯共用的輸入區。自己不打 API，存不存得成由上層決定。 */
export default function OrderEditor({ message, error, onChange, onSave }: Props) {
  return (
    <Stack spacing={1}>
      <TextField
        label="醫囑內容"
        value={message}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        multiline
        autoFocus
      />

      {/* role="alert" 讓螢幕閱讀器在錯誤出現時主動唸出來。 */}
      {error && (
        <Typography color="error" role="alert">
          {error}
        </Typography>
      )}

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={onSave}>
          儲存
        </Button>
      </Stack>
    </Stack>
  )
}
