import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from './Icono';

export function CampoTexto({ label, name, placeholder, value, onChange, type = 'text', disabled, readOnly, error, required, maxLength }) {
  const { inputCls, labelCls } = useTheme();

  const lockedCls = readOnly
    ? 'bg-slate-200/60 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 cursor-not-allowed select-all'
    : '';

  const InputTag = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div>
      {label && (
        <label htmlFor={name} className={labelCls}>
          {readOnly && <Icono nombre="lock" className="inline h-3 w-3 mr-1 -mt-0.5 text-slate-400" strokeWidth={2} />}
          {label}{required && <span className="text-red-400 ml-1">*</span>}
          {readOnly && <span className="ml-1.5 text-[10px] font-normal text-slate-400 uppercase tracking-normal">Precargado</span>}
        </label>
      )}
      <InputTag
        id={name}
        name={name}
        type={type === 'textarea' ? undefined : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled || readOnly}
        readOnly={readOnly}
        maxLength={maxLength}
        rows={type === 'textarea' ? 3 : undefined}
        className={`${inputCls} ${lockedCls} ${type === 'textarea' ? 'resize-none' : ''}`}
      />
      {error && <p className="text-red-400 text-xs mt-1 font-medium">{error}</p>}
    </div>
  );
}
