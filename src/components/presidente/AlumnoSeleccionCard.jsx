import { Icono } from '../ui/Icono';
import { AvatarInicial } from '../ui/AvatarInicial';
import { Badge } from '../ui/Badge';

export function AlumnoSeleccionCard({ alumno, esAprobado, modoOscuro, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`rounded-xl border p-4 cursor-pointer transition-all active:scale-[0.99] ${
        esAprobado
          ? 'bg-emerald-500/10 border-emerald-500/40'
          : modoOscuro
            ? 'bg-[#0e162c] border-slate-700/50 hover:border-slate-600/50'
            : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            esAprobado
              ? 'bg-emerald-500 border-emerald-500'
              : modoOscuro ? 'border-slate-600' : 'border-slate-400'
          }`}
        >
          {esAprobado && (
            <Icono nombre="check" className="h-4 w-4 text-white" strokeWidth={3} />
          )}
        </div>
        <AvatarInicial nombre={alumno.nombre_completo} color="amber" />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            {alumno.nombre_completo}
          </p>
          <p className="text-xs text-slate-500 font-mono">{alumno.matricula} · {alumno.carrera}</p>
        </div>
        <Badge texto={esAprobado ? 'Aprobado' : 'Rechazado'} color={esAprobado ? 'emerald' : 'red'} />
      </div>
    </div>
  );
}
