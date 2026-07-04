export function Th({ children, className = '' }) {
  return (
    <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider text-slate-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`py-4 px-3 text-sm text-slate-400 ${className}`}>
      {children}
    </td>
  );
}
