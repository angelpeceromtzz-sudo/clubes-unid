import { useTheme } from '../../../contexts/ThemeContext';
import { useAutenticacion } from '../../../contexts/AuthContext';
import { Spinner } from '../../ui/Spinner';

export function BloqueActions({ editando, enviando, completo, onToggleEdit, onEnviar, onImprimir, enviada, estado, onRechazar, puedeRechazar }) {
  const { esAdmin, usuario } = useAutenticacion();
  const { modoOscuro } = useTheme();
  const editable = usuario?.id_rol === 2 && !enviada && ['preparacion', 'rechazado', 'vencido'].includes(estado);
  const revisable = esAdmin && !enviada && estado === 'pendiente';
  const clase = 'flex-1 rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ';
  return <div className="flex flex-col gap-2 sm:flex-row">
    {editable && <button type="button" disabled={enviando} onClick={onToggleEdit} className={clase + (modoOscuro ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700')}>{editando ? 'Cerrar' : 'Editar fecha/hora/lugar'}</button>}
    {(editable || revisable) && <button type="button" onClick={onEnviar} disabled={enviando || !completo || editando || estado === 'vencido'} className={clase + 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500'}>{enviando ? <Spinner size="sm" color="border-current" className="!py-0" /> : revisable ? 'Aprobar y publicar' : 'Enviar a revisión'}</button>}
    {revisable && <button type="button" onClick={onRechazar} disabled={enviando || !puedeRechazar} className={clase + 'border-red-400/40 text-red-500'}>Devolver con observaciones</button>}
    {enviada && <button type="button" onClick={onImprimir} className={clase + 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'}>Lista de asistencia</button>}
  </div>;
}
