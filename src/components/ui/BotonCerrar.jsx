/* La X de cierre de los modales, con un único formato en toda la app.
   El estilo sale del modal "Anexar Nuevo Club": en oscuro arranca blanca y
   se vuelve ámbar al pasar el mouse; en claro va de slate-500 a slate-900.
   Los colores los pone el componente y no quien lo usa, para que ningún
   modal se desvíe del formato. `className` sólo debe agregar posicionamiento
   (p. ej. absolute) o tamaño, nunca colores. */
import { Icono } from './Icono';
import { useTheme } from '../../contexts/ThemeContext';

export function BotonCerrar({
  onClick,
  disabled = false,
  etiqueta = 'Cerrar',
  className = '',
}) {
  const { modoOscuro } = useTheme();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={etiqueta}
      aria-label={etiqueta}
      className={`transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        modoOscuro ? 'text-white hover:text-amber-400' : 'text-slate-500 hover:text-slate-900'
      } ${className}`}
    >
      <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
    </button>
  );
}
