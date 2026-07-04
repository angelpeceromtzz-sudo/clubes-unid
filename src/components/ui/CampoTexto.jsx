/* Campo de texto/textarea reutilizable con label, validación de error y soporte para tema oscuro/claro. */
import { useTheme } from '../../contexts/ThemeContext';

export function CampoTexto({ label, name, placeholder, value, onChange, type = 'text', disabled, error, required }) {
  const { inputCls, labelCls } = useTheme();
  return (
    <div>
      {label && (
        <label htmlFor={name} className={labelCls}>
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          rows={3}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={inputCls}
        />
      )}
      {error && <p className="text-red-400 text-xs mt-1 font-medium">{error}</p>}
    </div>
  );
}
