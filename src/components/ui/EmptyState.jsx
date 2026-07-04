/* Estado vacío con icono, título y descripción. Se usa cuando no hay datos que mostrar. */
import { Icono } from './Icono';

export function EmptyState({ icono = 'users', titulo, descripcion }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <Icono nombre={icono} className="h-12 w-12 mb-3 opacity-30" strokeWidth={1.5} />
      <p className="text-sm font-medium">{titulo}</p>
      {descripcion && <p className="text-xs mt-0.5">{descripcion}</p>}
    </div>
  );
}
