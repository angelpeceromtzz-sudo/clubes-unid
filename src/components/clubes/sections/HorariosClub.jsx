import { useEffect, useMemo, useState } from 'react';
import { useAutenticacion } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';
import { Icono } from '../../ui/Icono';
import { CalendarioGrid } from './CalendarioGrid';
import { HorarioStackedView } from './horarios/HorarioStackedView';
import { PropuestaHorarioClub } from './horarios/PropuestaHorarioClub';
import { calcularRangoHorario } from '../../../utils/horario';
import { ROW_HEIGHT, COL_HORA_W } from '../../../constants/horario';

export function HorariosClub({ club, modoOscuro, esMiembro, expandirHorarios = false }) {
  const { usuario } = useAutenticacion();
  const presidente = usuario?.id_rol === 2 && Number(club.id_presidente) === Number(usuario.id ?? usuario.id_usuario);
  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(expandirHorarios);
  useEffect(() => {
    let activo = true;
    api.getHorarios(club.id_club).then((datos) => { if (activo) { setHorarios(datos); setError(''); } }).catch((err) => { if (activo) setError(err.message); }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [club.id_club]);
  const { horaMin, horaMax } = useMemo(() => calcularRangoHorario(horarios), [horarios]);
  return <>
    <section className={`overflow-hidden rounded-2xl border ${modoOscuro ? 'border-slate-800 bg-[#0e162c]' : 'border-slate-200 bg-white'}`}>
      <header className="flex items-center gap-3 p-5"><Icono nombre="clock" className="h-5 w-5 text-amber-500" /><div><h2 className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Horario oficial</h2><p className={`mt-1 text-[11px] ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Sesiones aprobadas por Coordinación VIVE</p></div></header>
      {error && <p role="alert" className="px-5 pb-4 text-xs text-red-500">{error}</p>}
      {cargando ? <p className="p-5 text-xs text-slate-400">Cargando horario…</p> : !horarios.length ? <p className="p-5 text-xs text-slate-400">No hay sesiones oficiales vigentes.</p> : <>
        <div className="hidden md:block"><CalendarioGrid horarios={horarios} rowHeight={ROW_HEIGHT} colHoraWidth={COL_HORA_W} horaMin={horaMin} horaMax={horaMax} puedeVer={false} modoOscuro={modoOscuro} /></div>
        <div className="md:hidden"><HorarioStackedView horarios={horarios} puedeVer={false} puedeVerNotas={esMiembro || presidente} mostrarTodos={mostrarTodos} modoOscuro={modoOscuro} onToggleMostrar={() => setMostrarTodos((v) => !v)} /></div>
      </>}
    </section>
    {presidente && <PropuestaHorarioClub club={club} />}
  </>;
}
