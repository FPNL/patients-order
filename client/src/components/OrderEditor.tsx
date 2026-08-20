import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded'

interface Props {
  message: string
  error: string | null
  onChange: (message: string) => void
  onSave: () => void
}

/** 新增與編輯共用的輸入區。自己不打 API，存不存得成由上層決定。 */
export default function OrderEditor({ message, error, onChange, onSave }: Props) {
  return (
    // 淡藍底把輸入區跟上面的醫囑卡片分開：正在編輯的是哪一塊要一眼看得出來。
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 3,
        bgcolor: 'primary.light',
      }}
    >
      <Stack spacing={1.5}>
        <TextField
          label="醫囑內容"
          value={message}
          onChange={(event) => onChange(event.target.value)}
          fullWidth
          multiline
          minRows={3}
          autoFocus
          sx={{ bgcolor: 'background.paper', borderRadius: 3 }}
        />

        {/* role="alert" 讓螢幕閱讀器在錯誤出現時主動唸出來。 */}
        {error && (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} />
            <Typography color="error" variant="body2" role="alert">
              {error}
            </Typography>
          </Stack>
        )}

        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={onSave}>
            儲存
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
