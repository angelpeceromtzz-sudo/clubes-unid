import { useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from './Icono';

export function CampoTexto({ label, name, placeholder, value, onChange, onBlur, type = 'text', disabled, readOnly, error, required, maxLength, min, max, inputRef, autoComplete, inputMode, autoFocus, pattern }) {
  const { inputCls, labelCls, modoOscuro } = useTheme();
  const textareaRef = useRef(null);

  // Auto-resize para textarea: crece con el contenido.
  useEffect(() => {
    if (type !== 'textarea') return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, type]);

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
        ref={inputRef || textareaRef}
        id={name}
        name={name}
        type={type === 'textarea' ? undefined : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled || readOnly}
        readOnly={readOnly}
        maxLength={maxLength}
        min={min}
        max={max}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        autoFocus={autoFocus}
        pattern={pattern}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        rows={type === 'textarea' ? 3 : undefined}
        className={`${inputCls} ${lockedCls} ${type === 'textarea' ? 'resize-none overflow-hidden' : ''}`}
      />
      {maxLength && (value != null ? String(value).length : 0) >= maxLength - 20 && (
        <p className={`text-[10px] mt-1 text-right ${((value != null ? String(value).length : 0) >= maxLength) ? 'text-red-500 animate-pulse font-bold' : (modoOscuro ? 'text-slate-500' : 'text-slate-400')}`}>
          {(value != null ? String(value).length : 0)}/{maxLength} caracteres
        </p>
      )}
      {error && <p id={`${name}-error`} role="alert" className="text-red-400 text-xs mt-1 font-medium">{error}</p>}
    </div>
  );
}