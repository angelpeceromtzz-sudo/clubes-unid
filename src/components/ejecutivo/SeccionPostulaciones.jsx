import { useTheme } from '../../contexts/ThemeContext';
import { formatearEntero } from '../../utils/formatoPanel';
import { GraficaBarrasAgrupadas } from './GraficaBarrasAgrupadas';
import { ContenedorFiltros, Filtro } from './FiltroSeccion';

function combinarSeriesPorMes(postulaciones = [], inscripciones = []) {
  const mapa = new Map();
  for (const p of postulaciones) {
    mapa.set(p.clave, { clave: p.clave, mes: p.mes, postulaciones: p.total, inscripciones: 0 });
  }
  for (const i of inscripciones) {
    const actual = mapa.get(i.clave) || { clave: i.clave, mes: i.mes, postulaciones: 0, inscripciones: 0 };
    actual.inscripciones = i.total;
    mapa.set(i.clave, actual);
  }
  return [...mapa.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

export function SeccionPostulaciones({ d }) {
  const { cardCls, modoOscuro } = useTheme();

  const evolucionMensual = combinarSeriesPorMes(
    d.panelData?.postulacionesPorMes || [],
    d.panelData?.inscripcionesPorMes || []
  );

  return (
    <div className="space-y-6">
      <ContenedorFiltros
        titulo="Filtros"
        etiquetas={{ id_club: d.filtros.id_club, id_periodo: d.filtros.id_periodo, estado: d.filtros.estado }}
        listas={{ clubes: d.clubesDetalle, periodos: d.periodos }}
        onRestablecer={() => d.aplicarFiltros({ id_club: '', id_periodo: '', estado: '' })}
      >
        <Filtro label="Club" value={d.filtros.id_club} onChange={(e) => d.aplicarFiltros({ id_club: e.target.value })}>
          <option value="">Todos los clubes</option>
          {(d.clubesDetalle || []).map((c) => (
            <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>
          ))}
        </Filtro>
        <Filtro label="Periodo" value={d.filtros.id_periodo} onChange={(e) => d.aplicarFiltros({ id_periodo: e.target.value })}>
          <option value="">Todos los periodos</option>
          {(d.periodos || []).map((p) => (
            <option key={p.id_periodo} value={p.id_periodo}>{p.nombre}</option>
          ))}
        </Filtro>
        <Filtro label="Estado" value={d.filtros.estado} onChange={(e) => d.aplicarFiltros({ estado: e.target.value })}>
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="En revisión">En revisión</option>
          <option value="Miembro oficial">Miembro oficial</option>
        </Filtro>
      </ContenedorFiltros>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficaBarrasAgrupadas
          titulo="Evolución mensual"
          subtitulo={d.filtros.id_periodo ? 'Postulaciones e inscripciones en el periodo' : 'Últimos 6 meses'}
          datos={evolucionMensual}
          series={[
            { dataKey: 'postulaciones', nombre: 'Postulaciones' },
            { dataKey: 'inscripciones', nombre: 'Altas de inscripción' },
          ]}
          cargando={false}
          vacioMensaje="No hay postulaciones ni inscripciones para los filtros seleccionados."
        />
        <div className={`${cardCls} border rounded-2xl p-4 flex flex-col justify-center`}>
          <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            Solicitudes pendientes
          </h3>
          <p className={`text-3xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{formatearEntero(d.panelData?.solicitudesPendientes)}</p>
          <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
            Postulaciones en estado Pendiente o En revisión.
          </p>
        </div>
      </div>
    </div>
  );
}
