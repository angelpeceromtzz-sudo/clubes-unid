/* Select reutilizable con label, placeholder, opciones (string[] u objetos {value, label}) y validación de error. */
import { useTheme } from '../../contexts/ThemeContext';

export function CampoSelect({ label, name, value, onChange, opciones, placeholder, required, error }) {
  const { selectCls } = useTheme();
  const labelCls = 'block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const errorCls = 'text-red-400 text-xs mt-1 font-medium';
  return (
    <div>
      {label && (
        <label htmlFor={name} className={labelCls}>
          {label}{required && <span className="text-red-400">*</span>}
        </label>
      )}
      <select id={name} name={name} value={value} onChange={onChange} className={selectCls}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {opciones.map((op) => {
          const val = typeof op === 'string' ? op : op.value;
          const lbl = typeof op === 'string' ? op : op.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}
