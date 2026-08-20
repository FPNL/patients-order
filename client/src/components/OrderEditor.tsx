import Button from '@mui/material/Button'
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
    // 這是 Dialog 裡獨立的一段畫面，旁邊沒有別的東西要分開，所以不再包一層
    // 底色，輸入框直接佔滿整段。
    <Stack spacing={1.5}>
      {/* filled 變體的浮動標籤直接落在輸入框自己的底色上，不像 outlined
          會在邊框缺口露出底下的顏色。 */}
      <TextField
        label="醫囑內容"
        value={message}
        onChange={(event) => onChange(event.target.value)}
        variant="filled"
        fullWidth
        multiline
        minRows={6}
        autoFocus
        slotProps={{
          // 底線是一條直線，畫在圓角輸入框上會超出圓角。改用整圈邊框。
          input: { disableUnderline: true },
        }}
        sx={{
          '& .MuiFilledInput-root': {
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '&:hover, &.Mui-focused': { bgcolor: 'background.paper' },
            '&.Mui-focused': { borderColor: 'primary.main' },
          },
        }}
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
  )
}
