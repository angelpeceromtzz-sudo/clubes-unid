import { useTheme } from '../../contexts/ThemeContext';

export function Th({ children, className = '' }) {
  const { thCls } = useTheme();
  return (
    <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${thCls} ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  const { tdCls } = useTheme();
  return (
    <td className={`py-4 px-3 text-sm ${tdCls} ${className}`}>
      {children}
    </td>
  );
}
