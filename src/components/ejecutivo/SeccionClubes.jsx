import { useTheme } from '../../contexts/ThemeContext';
import { BarraOcupacion } from '../ui/BarraOcupacion';
import { GraficaOcupacionApilada } from './GraficaOcupacionApilada';
import { GraficaBarrasHorizontales } from './GraficaBarrasHorizontales';
import { ContenedorFiltros, Filtro } from './FiltroSeccion';
import { ListadoConVerTodos } from './ListadoConVerTodos';

export function SeccionClubes({ d }) {
  const { cardCls, modoOscuro } = useTheme();

  const clubSeleccionado = d.filtros.id_club
    ? d.clubesDetalle.find((c) => String(c.id_club) === String(d.filtros.id_club))
    : null;
  const nombreClubFiltro = clubSeleccionado?.nombre_club || 'Todos los clubes';

  const clubesConCupo = (d.clubesDetalle || [])
    .filter((c) => c.estatus === 'activo' && Number(c.cupo_maximo) > 0)
    .filter((c) => !d.filtros.id_club || String(c.id_club) === String(d.filtros.id_club));

  const ocupacionApilada = clubesConCupo
    .map((c) => {
      const ocupado = Number(c.cupo_ocupado) || 0;
      const cupo = Number(c.cupo_maximo) || 0;
      return {
        nombre_club: c.nombre_club,
        ocupado,
        disponible: Math.max(cupo - ocupado, 0),
        cupo,
      };
    })
    .sort((a, b) => b.ocupado - a.ocupado);

  const integrantesPorClub = (d.clubesDetalle || [])
    .filter((c) => c.estatus === 'activo')
    .filter((c) => !d.filtros.id_club || String(c.id_club) === String(d.filtros.id_club))
    .map((c) => ({ nombre_club: c.nombre_club, valor: Number(c.cupo_ocupado) || 0 }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const vacioOcupacion = d.filtros.id_club
    ? 'El club seleccionado no tiene cupo configurado o está inactivo.'
    : 'No hay clubes activos con cupo configurado.';
  const vacioIntegrantes = d.filtros.id_club
    ? 'El club seleccionado no tiene integrantes activos.'
    : 'No hay clubes con integrantes activos.';

  return (
    <div className="space-y-6">
      <ContenedorFiltros
        titulo="Filtros"
        etiquetas={{ id_club: d.filtros.id_club }}
        listas={{ clubes: d.clubesDetalle }}
        onRestablecer={() => d.aplicarFiltros({ id_club: '' })}
      >
        <Filtro label="Club" value={d.filtros.id_club} onChange={(e) => d.aplicarFiltros({ id_club: e.target.value })}>
          <option value="">Todos los clubes</option>
          {(d.clubesDetalle || []).map((c) => (
            <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>
          ))}
        </Filtro>
      </ContenedorFiltros>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficaOcupacionApilada
          titulo="Ocupación por club"
          subtitulo={d.filtros.id_club ? nombreClubFiltro : 'Clubes activos con cupo configurado'}
          datos={ocupacionApilada}
          cargando={false}
          vacioMensaje={vacioOcupacion}
        />
        <GraficaBarrasHorizontales
          titulo="Integrantes por club"
          subtitulo={d.filtros.id_club ? nombreClubFiltro : 'Integrantes activos, de mayor a menor'}
          datos={integrantesPorClub}
          dataKey="valor"
          labelKey="nombre_club"
          unit="integrantes"
          cargando={false}
          vacioMensaje={vacioIntegrantes}
        />
      </div>

      <div className={`${cardCls} border rounded-2xl p-4`}>
        <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Ocupación detallada
        </h3>
        {ocupacionApilada.length === 0 ? (
          <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{vacioOcupacion}</p>
        ) : (
          <ListadoConVerTodos
            items={ocupacionApilada}
            limite={10}
            textoPlural="clubes"
            textoSingular="club"
            renderItem={(c) => (
              <BarraOcupacion
                key={c.nombre_club}
                nombre={c.nombre_club}
                maximo={c.cupo}
                ocupado={c.ocupado}
                modoOscuro={modoOscuro}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
