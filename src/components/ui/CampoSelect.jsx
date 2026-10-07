/* Select reutilizable con label, placeholder, opciones (string[] u objetos {value, label, disabled}) y validación de error. */
import { useTheme } from '../../contexts/ThemeContext';

export function CampoSelect({ label, name, value, onChange, opciones, placeholder, required, error, disabled }) {
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
      <select id={name} name={name} value={value} onChange={onChange} disabled={disabled} className={`${selectCls} disabled:opacity-60 disabled:cursor-not-allowed`}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {opciones.map((op) => {
          const val = typeof op === 'string' ? op : op.value;
          const lbl = typeof op === 'string' ? op : op.label;
// `disabled` por opción: hay estados que no se pueden elegir y no se
          // pueden quitar del <select> (si no, quitarlo deja la encuesta en un
          // estado que nadie eligió). Deshabilitar la opción lo explica sin
          // tener que borrarla.
          const optDisabled = typeof op === 'string' ? false : Boolean(op.disabled);
          return <option key={val} value={val} disabled={optDisabled}>{lbl}</option>;
        })}
      </select>
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}
