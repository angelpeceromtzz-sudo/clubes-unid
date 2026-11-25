import { useTheme } from '../../contexts/ThemeContext';
import { tipoFecha, estiloTipoFecha } from '../../constants/tiposFecha';
import { Icono } from '../ui/Icono';

export function SimboloFecha({ tipo, compacto = false, mini = false }) {
  const { modoOscuro } = useTheme();
  return (
    <span aria-hidden="true" data-simbolo-fecha={tipo} className={`inline-flex shrink-0 items-center justify-center rounded-md border ${mini ? 'h-3.5 w-3.5' : compacto ? 'h-6 w-6 rounded-lg' : 'h-9 w-9 rounded-lg'} ${estiloTipoFecha(tipo, modoOscuro)}`}>
      <Icono nombre={tipoFecha(tipo).icono} className={mini ? 'h-2.5 w-2.5' : compacto ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'} strokeWidth={1.8} />
    </span>
  );
}
