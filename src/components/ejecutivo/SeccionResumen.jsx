import { TarjetaKPI } from './TarjetaKPI';
import { useTheme } from '../../contexts/ThemeContext';
import { formatearEntero, formatearPorcentaje } from '../../utils/formatoDashboard';
import { GraficaPastel } from './GraficaPastel';
import { GraficaOcupacionApilada } from './GraficaOcupacionApilada';

export function SeccionResumen({ d }) {
  const { cardCls, modoOscuro } = useTheme();

  const stats = d.stats || {};
  const totalAlumnos = stats.totalAlumnos || 0;
  const alumnosInscritos = stats.alumnosInscritos || 0;
  const clubesActivos = (d.clubesDetalle || []).filter((c) => c.estatus === 'activo').length;

  const clubesConCupo = (d.clubesDetalle || []).filter((c) => c.estatus === 'activo' && Number(c.cupo_maximo) > 0);
  const cupoTotal = clubesConCupo.reduce((acc, c) => acc + (Number(c.cupo_maximo) || 0), 0);
  const ocupadoTotal = clubesConCupo.reduce((acc, c) => acc + (Number(c.cupo_ocupado) || 0), 0);

  const evaluadas = (d.asistencia?.global?.presentes || 0) + (d.asistencia?.global?.ausentes || 0);
  const participacion = [
    { id: 'con-club', nombre: d.filtros.id_club ? 'En el club seleccionado' : 'Con inscripción activa', valor: alumnosInscritos },
    { id: 'sin-club', nombre: d.filtros.id_club ? 'Otros alumnos registrados' : 'Sin inscripción activa', valor: totalAlumnos - alumnosInscritos },
  ];
  const ocupacion = clubesConCupo
    .filter((club) => !d.filtros.id_club || String(club.id_club) === String(d.filtros.id_club))
    .map((club) => ({ nombre_club: club.nombre_club, ocupado: Number(club.cupo_ocupado) || 0, cupo: Number(club.cupo_maximo) }))
    .sort((a, b) => b.ocupado - a.ocupado);
  const clubSeleccionado = d.clubesDetalle?.find((club) => String(club.id_club) === String(d.filtros.id_club));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaKPI
          titulo="Participación"
          valor={formatearPorcentaje(alumnosInscritos, totalAlumnos)}
          descripcion={`${formatearEntero(alumnosInscritos)} de ${formatearEntero(totalAlumnos)} alumnos activos`}
          contexto={`${formatearEntero(clubesActivos)} clubes activos. Situación actual.`}
        />
        <TarjetaKPI
          titulo="Ocupación"
          valor={formatearPorcentaje(ocupadoTotal, cupoTotal)}
          descripcion={`${formatearEntero(ocupadoTotal)} de ${formatearEntero(cupoTotal)} plazas`}
          contexto="Cupo de clubes activos. Situación actual."
        />
        <TarjetaKPI
          titulo="Asistencia"
          valor={formatearPorcentaje(d.asistencia?.global?.presentes, evaluadas, 1)}
          descripcion="Presentes sobre presentes + ausentes"
          contexto="Filtra por club y periodo en la pestaña Asistencia."
        />
        <TarjetaKPI
          titulo="Respuestas"
          valor={formatearEntero(d.encuestas?.total_respuestas)}
          descripcion="Respuestas recibidas en encuestas"
          contexto="Filtra por licenciatura en la pestaña Encuestas."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <GraficaOcupacionApilada
          titulo="Así se distribuyen los cupos"
          subtitulo={clubSeleccionado?.nombre_club ?? 'Integrantes y plazas disponibles en los clubes activos'}
          datos={ocupacion}
          vacioMensaje="Todavía no hay clubes activos con cupo configurado."
        />
        <GraficaPastel
          titulo="Participación en clubes"
          subtitulo={clubSeleccionado?.nombre_club ?? 'Alumnos registrados en la plataforma'}
          ceja="Comunidad Clubs UNID"
          datos={participacion}
          unidad="alumnos"
          nota="Situación actual de los alumnos registrados en la plataforma."
          vacioMensaje="Todavía no hay alumnos registrados para mostrar la participación."
        />
      </div>

      <div className={`${cardCls} border rounded-2xl p-4`}>
        <h3 className={`text-sm font-black uppercase tracking-wider mb-2 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Indicadores de situación actual
        </h3>
        <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          Estas cifras corresponden al estado actual del ecosistema de clubes. Los filtros se aplican en sus respectivas pestañas.
        </p>
      </div>
    </div>
  );
}
