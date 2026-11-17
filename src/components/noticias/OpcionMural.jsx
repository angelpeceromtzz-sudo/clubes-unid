import { useId } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export function OpcionMural({ checked, onChange, disabled = false }) {
  const { modoOscuro, tema } = useTheme();
  const ayudaId = useId();
  return (
    <label className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${checked ? modoOscuro ? 'border-amber-400/40 bg-amber-400/5' : 'border-amber-300 bg-amber-50/70' : modoOscuro ? 'border-slate-700/60' : 'border-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <span aria-hidden="true" className="text-2xl">🖼️</span>
      <span className="flex-1 min-w-0"><span className={`block text-sm font-bold ${tema.title}`}>También en el mural</span><span id={ayudaId} className={`block mt-1 text-xs leading-relaxed ${tema.subtitle}`}>Al publicar, aparecerá en el mural público del calendario.</span></span>
      <input type="checkbox" name="mostrar_en_mural" checked={checked} onChange={onChange} disabled={disabled} aria-describedby={ayudaId} className="h-5 w-5 shrink-0 accent-amber-400 cursor-pointer" />
    </label>
  );
}
