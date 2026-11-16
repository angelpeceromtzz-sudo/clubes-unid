/* Registros de inscripción: no asigna periodos a datos antiguos. */
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';

function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', year: 'numeric' });
}
function icono(categoria) {
  const texto = (categoria || '').toLowerCase();
  if (texto.includes('cultura')) return 'drama';
  if (texto.includes('tecnolog')) return 'cpu';
  if (texto.includes('deporte')) return 'trophy';
  return 'users';
}
export function SeccionHistorialClubs({ inscripciones }) {
  const { modoOscuro, cardCls } = useTheme();
  const lista = Array.isArray(inscripciones) ? inscripciones : [];
  return <section className="space-y-4">
    <div><h2 className={`text-lg font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Historial de inscripciones</h2><p className={`mt-1 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Consulta tus altas y bajas registradas en los clubes.</p></div>
    {lista.length === 0 ? <div className={`${cardCls} rounded-2xl border p-6 text-center`}><p>Aún no tienes registros de inscripción.</p></div> : <ul className="space-y-3">
      {lista.map((fila) => <li key={fila.id_inscripcion} className={`${cardCls} rounded-2xl border p-4 flex items-center gap-3`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${modoOscuro ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}><Icono nombre={icono(fila.categoria)} className="h-5 w-5" /></span>
        <div className="min-w-0"><p className={`font-semibold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{fila.nombre_club}</p><p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Estado: {fila.estatus_inscripcion || '—'}</p><p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Alta: {formatearFecha(fila.fecha_inscripcion)}{fila.fecha_baja ? ` · Baja: ${formatearFecha(fila.fecha_baja)}` : ''}</p></div>
      </li>)}
    </ul>}
  </section>;
}
