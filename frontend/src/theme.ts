import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e91e63',
      light: '#f2528c',
      dark: '#c2185b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7b809a',
      light: '#8f93a9',
      dark: '#60657d',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      contrastText: '#ffffff',
    },
    info: {
      main: '#1a73e8',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#fb8c00',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44335',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f172a',
      paper: '#172033',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.04em',
      color: '#f8fafc',
    },
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.04em',
      color: '#f8fafc',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#f8fafc',
    },
    h5: {
      fontWeight: 700,
      color: '#f8fafc',
    },
    h6: {
      fontWeight: 700,
      color: '#f8fafc',
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: '0.0075em',
    },
    body2: {
      color: '#94a3b8',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0f172a',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 20px 27px 0 rgba(0, 0, 0, 0.25)',
          overflow: 'visible',
          border: '1px solid rgba(148, 163, 184, 0.12)',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '1.5rem 1.5rem 0',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '1.5rem',
          '&:last-child': {
            paddingBottom: '1.5rem',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingInline: 20,
          minHeight: 40,
          boxShadow: '0 8px 24px rgba(233, 30, 99, 0.28)',
        },
        containedSecondary: {
          boxShadow: '0 8px 24px rgba(123, 128, 154, 0.22)',
        },
        containedInfo: {
          boxShadow: '0 8px 24px rgba(26, 115, 232, 0.24)',
        },
        containedSuccess: {
          boxShadow: '0 8px 24px rgba(76, 175, 80, 0.24)',
        },
        outlined: {
          borderWidth: 1,
          borderColor: 'rgba(148, 163, 184, 0.26)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          '& fieldset': {
            borderColor: 'rgba(148, 163, 184, 0.22)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(148, 163, 184, 0.4)',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#e91e63',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#94a3b8',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: '#94a3b8',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderBottomColor: 'rgba(148, 163, 184, 0.12)',
        },
        body: {
          color: '#e2e8f0',
          borderBottomColor: 'rgba(148, 163, 184, 0.12)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          height: 28,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          alignItems: 'center',
          border: '1px solid rgba(148, 163, 184, 0.14)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#94a3b8',
        },
      },
    },
  },
});
