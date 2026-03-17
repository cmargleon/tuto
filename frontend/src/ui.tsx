import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';

export type ColorKey = 'dark' | 'secondary' | 'danger' | 'success' | 'info' | 'warning';
type ButtonVariantKey = 'ghost' | 'outline' | undefined;

const colorToMui = (color?: ColorKey) => {
  switch (color) {
    case 'danger':
      return 'error';
    case 'success':
      return 'success';
    case 'info':
      return 'info';
    case 'warning':
      return 'warning';
    case 'secondary':
      return 'secondary';
    default:
      return 'primary';
  }
};

const buttonVariantToMui = (variant?: ButtonVariantKey) => {
  switch (variant) {
    case 'ghost':
      return 'text';
    case 'outline':
      return 'outlined';
    default:
      return 'contained';
  }
};

const spacingClassToValue = (className?: string): number => {
  if (!className) {
    return 0;
  }

  if (className.includes('g-4')) {
    return 3;
  }

  if (className.includes('g-3')) {
    return 2;
  }

  if (className.includes('g-2')) {
    return 1.5;
  }

  return 0;
};

interface CommonProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const CAlert = ({ color, children, className }: CommonProps & { color?: ColorKey }) => (
  <Alert severity={colorToMui(color) as 'error' | 'success' | 'info' | 'warning'} className={className}>
    {children}
  </Alert>
);

export const CBadge = ({
  color,
  children,
  className,
}: CommonProps & { color?: ColorKey; shape?: 'rounded-pill' }) => (
  <Chip
    label={children}
    color={colorToMui(color) as 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'}
    size="small"
    className={className}
  />
);

export const CButton = ({
  children,
  color,
  variant,
  className,
  size,
  ...props
}: CommonProps & {
  color?: ColorKey;
  variant?: ButtonVariantKey;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'lg';
}) => (
  <Button
    color={colorToMui(color) as 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'}
    variant={buttonVariantToMui(variant)}
    className={className}
    size={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium'}
    {...props}
  >
    {children}
  </Button>
);

export const CCard = ({ children, className }: CommonProps) => <Card className={className}>{children}</Card>;

export const CCardBody = ({ children, className }: CommonProps) => <CardContent className={className}>{children}</CardContent>;

export const CCardHeader = ({ children, className }: CommonProps) => (
  <CardHeader className={className} titleTypographyProps={{ component: 'div' }} title={children} />
);

export const CCol = ({
  children,
  className,
  xs,
  sm,
  md,
  lg,
  xl,
}: CommonProps & { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }) => (
  <Box
    className={[
      'mui-col',
      xs ? `mui-col-xs-${xs}` : 'mui-col-xs-12',
      sm ? `mui-col-sm-${sm}` : '',
      md ? `mui-col-md-${md}` : '',
      lg ? `mui-col-lg-${lg}` : '',
      xl ? `mui-col-xl-${xl}` : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </Box>
);

export const CRow = ({ children, className }: CommonProps) => (
  <Box
    className={['mui-row', className ?? ''].join(' ')}
    style={{ ['--row-gap' as string]: `${spacingClassToValue(className) * 8}px` }}
  >
    {children}
  </Box>
);

export const CFormInput = ({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  type === 'file' ? (
    <input className={`material-file-input ${className ?? ''}`} type="file" {...props} />
  ) : (
  <TextField
    className={className}
    type={type}
    size="small"
    fullWidth
    variant="outlined"
    InputLabelProps={{ shrink: true }}
    inputProps={{
      accept: props.accept,
      multiple: props.multiple,
      name: props.name,
    }}
    value={type === 'file' ? undefined : (props.value as string | number | readonly string[] | undefined)}
    onChange={props.onChange}
    placeholder={props.placeholder}
    id={props.id}
  />
  )
);

export const CFormLabel = ({ children, className, htmlFor }: CommonProps & { htmlFor?: string }) => (
  <label htmlFor={htmlFor} className={className ? `form-label ${className}` : 'form-label'}>
    {children}
  </label>
);

export const CFormTextarea = ({
  className,
  rows,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number; className?: string }) => (
  <TextField
    className={className}
    multiline
    rows={rows}
    fullWidth
    size="small"
    variant="outlined"
    value={props.value}
    onChange={props.onChange}
  />
);

export const CFormSelect = ({
  className,
  children,
  value,
  onChange,
  disabled,
  id,
}: {
  className?: string;
  children?: ReactNode;
  value?: string | number;
  onChange?: (event: any) => void;
  disabled?: boolean;
  id?: string;
}) => (
  <TextField
    select
    SelectProps={{ native: true }}
    fullWidth
    size="small"
    className={className}
    value={value ?? ''}
    onChange={onChange}
    disabled={disabled}
    id={id}
  >
    {children}
  </TextField>
);

export const CFormCheck = ({
  checked,
  onChange,
  disabled,
  readOnly,
}: {
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) => <Checkbox checked={checked} onChange={onChange} disabled={disabled || readOnly} />;

export const CFormRange = ({
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) => (
  <input
    className="material-range"
    type="range"
    value={value}
    min={min}
    max={max}
    step={step}
    onChange={onChange}
    disabled={disabled}
  />
);

export const CSpinner = ({ color }: { color?: ColorKey }) => (
  <CircularProgress color={colorToMui(color) as 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'} size={24} />
);

export const CTable = ({ children, className }: CommonProps & { align?: string; responsive?: boolean; hover?: boolean }) => (
  <TableContainer className={className}>
    <Table size="small">{children}</Table>
  </TableContainer>
);

export const CTableHead = ({ children }: CommonProps) => <TableHead>{children}</TableHead>;
export const CTableBody = ({ children }: CommonProps) => <TableBody>{children}</TableBody>;
export const CTableRow = ({ children }: CommonProps) => <TableRow>{children}</TableRow>;
export const CTableHeaderCell = ({ children, className }: CommonProps) => (
  <TableCell className={className} sx={{ fontWeight: 700 }}>
    {children}
  </TableCell>
);
export const CTableDataCell = ({ children, className }: CommonProps) => <TableCell className={className}>{children}</TableCell>;
