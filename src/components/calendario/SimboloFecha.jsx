import { useTheme } from '../../contexts/ThemeContext';
import { tipoFecha } from '../../constants/tiposFecha';
import { Icono } from '../ui/Icono';

export function SimboloFecha({ tipo, compacto = false }) {
  const { modoOscuro } = useTheme();
  return (
    <span aria-hidden="true" data-simbolo-fecha={tipo} className={`inline-flex shrink-0 items-center justify-center rounded-md border leading-none ${compacto ? 'h-6 w-6 text-sm' : 'h-8 w-8 text-base'} ${modoOscuro ? 'border-slate-600/50 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
      <Icono nombre={tipoFecha(tipo).icono || 'calendar'} className={compacto ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={1.7} />
    </span>
  );
}
