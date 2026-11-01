import { useTheme } from '../../contexts/ThemeContext';
import { formatearEntero, formatearPorcentaje } from '../../utils/formatoDashboard';
import { GraficaBarrasHorizontales } from './GraficaBarrasHorizontales';
import { ContenedorFiltros, Filtro } from './FiltroSeccion';
import { TablaDesplegable } from './TablaDesplegable';

export function SeccionAsistencia({ d }) {
  const { cardCls, modoOscuro } = useTheme();

  const asistenciaPorClub = (d.asistencia?.por_club || [])
    .map((c) => {
      const ev = (c.presentes || 0) + (c.ausentes || 0);
      return {
        id_club: c.id_club,
        nombre_club: c.nombre_club,
        presentes: c.presentes || 0,
        ausentes: c.ausentes || 0,
        justificadas: c.justificadas || 0,
        valor: ev > 0 ? Math.round((c.presentes / ev) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => a.valor - b.valor);

  const evaluadas = (d.asistencia?.global?.presentes || 0) + (d.asistencia?.global?.ausentes || 0);

  return (
    <div className="space-y-6">
      <ContenedorFiltros
        titulo="Filtros"
        etiquetas={{ id_club: d.filtros.id_club, id_periodo: d.filtros.id_periodo }}
        listas={{ clubes: d.clubesDetalle, periodos: d.periodos }}
        onRestablecer={() => d.aplicarFiltros({ id_club: '', id_periodo: '' })}
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
      </ContenedorFiltros>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficaBarrasHorizontales
          titulo="Asistencia por club (%)"
          subtitulo={d.filtros.id_periodo ? 'Sesiones completadas en el periodo' : 'Sesiones completadas'}
          datos={asistenciaPorClub}
          dataKey="valor"
          labelKey="nombre_club"
          unit="%"
          maxDomain={100}
          cargando={false}
          vacioMensaje="No hay sesiones completadas con asistencia registrada para los filtros seleccionados."
        />
        <div className={`${cardCls} border rounded-2xl p-4`}>
          <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            Asistencia en sesiones completadas
          </h3>
          {d.asistencia?.estado === 'sin_datos' ? (
            <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>No hay sesiones completadas con asistencia registrada.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className={`text-2xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                    {formatearPorcentaje(d.asistencia?.global?.presentes, evaluadas, 1)}
                  </p>
                  <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Promedio</p>
                </div>
                <div>
                  <p className={`text-2xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{formatearEntero(d.asistencia?.global?.presentes)}</p>
                  <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Presentes</p>
                </div>
                <div>
                  <p className={`text-2xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{formatearEntero(d.asistencia?.global?.ausentes)}</p>
                  <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Ausentes</p>
                </div>
                <div>
                  <p className={`text-2xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{formatearEntero(d.asistencia?.global?.justificadas)}</p>
                  <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Justificadas</p>
                </div>
              </div>
              <p className={`text-xs mb-2 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                Fórmula: presentes / (presentes + ausentes) en sesiones completadas. Las justificadas se muestran aparte.
              </p>
              <TablaDesplegable titulo="Ver tabla de asistencia por club" subtitulo={`${asistenciaPorClub.length} clubes`}>
                <table className="w-full text-sm min-w-[500px]">
                  <thead className={`${modoOscuro ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <tr>
                      <th className="text-left px-3 py-2">Club</th>
                      <th className="text-right px-3 py-2">% Asistencia</th>
                      <th className="text-right px-3 py-2">Presentes</th>
                      <th className="text-right px-3 py-2">Ausentes</th>
                      <th className="text-right px-3 py-2">Justificadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistenciaPorClub.map((c) => (
                      <tr key={c.id_club} className={`border-t ${modoOscuro ? 'border-slate-700' : 'border-slate-200'}`}>
                        <td className="px-3 py-2">{c.nombre_club}</td>
                        <td className="px-3 py-2 text-right">{c.valor === null ? 'Sin registros' : `${c.valor}%`}</td>
                        <td className="px-3 py-2 text-right">{formatearEntero(c.presentes)}</td>
                        <td className="px-3 py-2 text-right">{formatearEntero(c.ausentes)}</td>
                        <td className="px-3 py-2 text-right">{formatearEntero(c.justificadas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablaDesplegable>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
