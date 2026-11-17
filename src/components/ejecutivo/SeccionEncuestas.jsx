import { useTheme } from '../../contexts/ThemeContext';
import { formatearEntero } from '../../utils/formatoPanel';
import { GraficaBarrasHorizontales } from './GraficaBarrasHorizontales';
import { GraficaPreguntaEncuesta } from './GraficaPreguntaEncuesta';
import { MarcoGrafica, EstadoGrafica } from './MarcoGrafica';
import { ContenedorFiltros, Filtro } from './FiltroSeccion';

export function SeccionEncuestas({ d }) {
  const { modoOscuro } = useTheme();
  const sinLicenciatura = d.encuestas?.sin_licenciatura || 0;
  const respuestasPorLicenciatura = (d.encuestas?.por_licenciatura || [])
    .map((licenciatura) => ({ nombre: licenciatura.nombre, valor: licenciatura.respuestas }))
    .concat(sinLicenciatura > 0 ? [{ nombre: 'Sin licenciatura', valor: sinLicenciatura }] : [])
    .sort((a, b) => b.valor - a.valor);
  const totalRespuestas = d.encuestas?.total_respuestas || 0;
  const pregunta = d.preguntaSeleccionada
    ? (d.resultadosEncuesta?.preguntas || []).find((item) => String(item.id_pregunta) === String(d.preguntaSeleccionada))
    : null;
  const esEscala = pregunta?.tipo === 'escala';
  const esTexto = ['texto_corto', 'texto_largo'].includes(pregunta?.tipo);
  const vacioLicenciatura = d.filtros.carrera
    ? 'No hay respuestas de la licenciatura seleccionada.'
    : 'No hay respuestas con licenciatura registrada.';
  const vacioEncuestas = totalRespuestas === 0
    ? 'Ninguna encuesta ha recibido respuestas. Cuando los alumnos respondan, aquí aparecerá el análisis por licenciatura y por pregunta.'
    : null;
  return (
    <div className="space-y-6">
      <ContenedorFiltros
        titulo="Filtros"
        etiquetas={{ carrera: d.filtros.carrera }}
        listas={{ licenciaturas: d.licenciaturas }}
        onRestablecer={() => { d.seleccionarEncuesta(''); d.aplicarFiltros({ carrera: '' }); }}
      >
        <Filtro label="Encuesta" value={d.encuestaSeleccionada} onChange={(e) => d.seleccionarEncuesta(e.target.value)}>
          <option value="">Selecciona una encuesta</option>
          {(d.listaEncuestas || []).map((encuesta) => (
            <option key={encuesta.id_encuesta} value={encuesta.id_encuesta}>{encuesta.titulo} ({encuesta.total_respuestas} respuestas)</option>
          ))}
        </Filtro>
        {d.encuestaSeleccionada && (
          <Filtro label="Pregunta" value={d.preguntaSeleccionada} onChange={(e) => d.seleccionarPregunta(e.target.value)}>
            <option value="">Selecciona una pregunta</option>
            {(d.resultadosEncuesta?.preguntas || []).map((item) => (
              <option key={item.id_pregunta} value={item.id_pregunta}>{item.texto}</option>
            ))}
          </Filtro>
        )}
        <Filtro label="Licenciatura" value={d.filtros.carrera} onChange={(e) => d.aplicarFiltros({ carrera: e.target.value })}>
          <option value="">Todas las licenciaturas</option>
          {(d.licenciaturas || []).map((licenciatura) => (
            <option key={licenciatura.id_licenciatura} value={licenciatura.id_licenciatura}>{licenciatura.nombre}</option>
          ))}
        </Filtro>
      </ContenedorFiltros>
      {vacioEncuestas && (
        <div className={`rounded-2xl border p-4 ${modoOscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <p className="text-sm">{vacioEncuestas}</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <GraficaBarrasHorizontales
          titulo="Respuestas por licenciatura"
          subtitulo="Conjunto de encuestas"
          datos={respuestasPorLicenciatura}
          unit="respuestas"
          vacioMensaje={vacioLicenciatura}
        />
        <div className="space-y-4 min-w-0">
          {(!pregunta || d.cargandoResultados) && (
            <MarcoGrafica titulo="Preferencias de encuestas" ceja="La voz de los alumnos">
              <EstadoGrafica cargando={d.cargandoResultados} mensaje={d.encuestaSeleccionada
                ? 'Selecciona una pregunta para consultar sus respuestas.'
                : 'Selecciona una encuesta y una pregunta para explorar los resultados.'} />
            </MarcoGrafica>
          )}
          {!d.cargandoResultados && pregunta && !esEscala && !esTexto && (
            <GraficaPreguntaEncuesta key={d.encuestaSeleccionada + '-' + pregunta.id_pregunta} pregunta={pregunta} />
          )}
          {!d.cargandoResultados && esEscala && (
            <GraficaBarrasHorizontales
              titulo={pregunta.texto}
              subtitulo={'Promedio: ' + (pregunta.promedio ?? 'Sin datos') + ' · escala de ' + pregunta.escala_min + ' a ' + pregunta.escala_max}
              datos={pregunta.respuestas > 0 ? (pregunta.distribucion || [])
                .map((item) => ({
                  nombre: String(item.valor), valor: item.conteo, porcentaje: item.porcentaje,
                }))
                .sort((a, b) => Number(a.nombre) - Number(b.nombre))
                : []}
              unit="respuestas"
              vacioMensaje="Nadie ha respondido esta pregunta todavía."
            />
          )}
          {!d.cargandoResultados && esTexto && (
            <MarcoGrafica titulo={pregunta.texto} ceja="Respuestas abiertas" subtitulo={formatearEntero(pregunta.total_textos) + ' respuestas recibidas'}>
              <ul className={'space-y-3 max-h-80 overflow-y-auto text-sm ' + (modoOscuro ? 'text-slate-300' : 'text-slate-600')}>
                {(pregunta.textos || []).slice(0, 20).map((texto, indice) => <li key={indice}>{texto.texto}</li>)}
              </ul>
              {!pregunta.total_textos && <EstadoGrafica mensaje="Todavía no hay respuestas a esta pregunta." />}
            </MarcoGrafica>
          )}
        </div>
      </div>
    </div>
  );
}
