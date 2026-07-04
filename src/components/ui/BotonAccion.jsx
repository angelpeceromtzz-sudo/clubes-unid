/* Botón reutilizable con variantes (primary, danger, success, outline) y tamaños (sm, md, lg). */
import { useTheme } from '../../contexts/ThemeContext';

export function BotonAccion({ children, onClick, disabled, variant = 'primary', size = 'md', className = '', type = 'button' }) {
  const { modoOscuro } = useTheme();
  const base = 'font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  const sizes = { sm: 'text-[10px] px-3 py-2', md: 'text-xs px-5 py-3', lg: 'text-sm px-6 py-3.5' };
  const variants = {
    primary: 'bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40',
    success: 'bg-emerald-500 hover:bg-emerald-400 text-black font-black',
    outline: modoOscuro ? 'border border-slate-600 text-slate-300 hover:bg-slate-800' : 'border border-slate-300 text-slate-700 hover:bg-slate-100',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}
