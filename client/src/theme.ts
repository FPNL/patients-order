import { createTheme } from '@mui/material/styles'

/**
 * Google（Material 3）風格的視覺基調：Google Blue 當主色、Grey 50 當底、
 * 大圓角與極淡的陰影。集中在這裡定義，component 只寫版面不寫顏色。
 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#1a73e8',
      dark: '#1557b0',
      light: '#e8f0fe',
      contrastText: '#ffffff',
    },
    error: { main: '#d93025' },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    divider: '#e8eaed',
  },

  shape: { borderRadius: 12 },

  typography: {
    fontFamily: 'Roboto, "Noto Sans TC", "PingFang TC", sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 500, letterSpacing: 0 },
    h2: { fontSize: '1.375rem', fontWeight: 500, letterSpacing: 0 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
  },

  components: {
    MuiPaper: {
      styleOverrides: {
        // Material 3 用色塊與細邊界取代重陰影，這裡把 MUI 預設的灰階陰影蓋掉。
        rounded: { backgroundImage: 'none' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          boxShadow: '0 8px 24px rgba(60,64,67,.15), 0 1px 3px rgba(60,64,67,.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        // 藥丸形按鈕是 Material 3 最好認的特徵。
        root: { borderRadius: 999, paddingInline: 24, minHeight: 40 },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          '&:hover': { backgroundColor: '#f1f3f4' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
})

export default theme
