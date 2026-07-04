/* Pantalla de éxito/completado con icono, título, descripción y botón de volver. */
import { Icono } from './Icono';
import { BotonAccion } from './BotonAccion';

export function PantallaCompletado({ icono = 'check-circle', titulo, descripcion, onVolver, textoVolver = 'Volver' }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
        <Icono nombre={icono} strokeWidth={2} className="h-8 w-8 text-emerald-400" />
      </div>
      {titulo && <h3 className="text-lg font-black uppercase tracking-wider text-white mb-2">{titulo}</h3>}
      {descripcion && <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">{descripcion}</p>}
      {onVolver && <BotonAccion onClick={onVolver} size="lg">{textoVolver}</BotonAccion>}
    </div>
  );
}
