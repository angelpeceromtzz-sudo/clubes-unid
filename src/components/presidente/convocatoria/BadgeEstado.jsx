import { Icono } from '../../ui/Icono';

export function BadgeEstado({ estado }) {
  if (estado === 'abierto') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
        <Icono nombre="check-circle" strokeWidth={2} className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Abierta</span>
      </div>
    );
  }
  if (estado === 'proximo') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-400">
        <Icono nombre="clock" strokeWidth={2} className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Abre pronto</span>
      </div>
    );
  }
  if (estado === 'lleno') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400">
        <Icono nombre="alert-triangle" strokeWidth={2} className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Cupo lleno</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400">
      <Icono nombre="close" strokeWidth={2} className="h-4 w-4" />
      <span className="text-sm font-bold uppercase tracking-wider">Cerrada</span>
    </div>
  );
}
