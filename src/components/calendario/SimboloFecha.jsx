import { useTheme } from '../../contexts/ThemeContext';
import { tipoFecha, estiloTipoFecha } from '../../constants/tiposFecha';
import { Icono } from '../ui/Icono';

export function SimboloFecha({ tipo, compacto = false }) {
  const { modoOscuro } = useTheme();
  return (
    <span aria-hidden="true" data-simbolo-fecha={tipo} className={`inline-flex shrink-0 items-center justify-center rounded-lg border ${compacto ? 'h-6 w-6' : 'h-9 w-9'} ${estiloTipoFecha(tipo, modoOscuro)}`}>
      <Icono nombre={tipoFecha(tipo).icono} className={compacto ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'} strokeWidth={1.8} />
    </span>
  );
}
