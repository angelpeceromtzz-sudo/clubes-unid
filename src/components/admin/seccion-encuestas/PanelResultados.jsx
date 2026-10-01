// Resultados de una encuesta.
//
// Todo lo que se muestra aquí llega ya agregado desde
// `GET /encuestas/admin/:id/resultados`. Este componente no consulta ni cuenta
// nada: sólo presenta. Esa separación es a propósito, porque el promedio de una
// escala tiene que ponderar por cuántas respuestas hay de cada valor y eso es
// mucho más fácil de hacer mal dos veces.
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { EmptyState } from '../../ui/EmptyState';
import { GraficaBarras } from './GraficaBarras';
import { etiquetaTipoPregunta } from '../../../constants/encuesta';

function Tarjeta({ titulo, children, extra }) {
  const { cardCls } = useTheme();

  return (
    <section className={`${cardCls} border rounded-2xl p-5`}>
      {titulo && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider">{titulo}</h3>
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

function Metrica({ etiqueta, valor, nota }) {
  const { tema } = useTheme();

  return (
    <div>
      <p className={`text-3xl font-black ${tema.title}`}>{valor}</p>
      <p className={`text-[10px] uppercase tracking-widest font-bold ${tema.subtitle}`}>{etiqueta}</p>
      {nota && <p className={`text-[11px] mt-0.5 ${tema.subtitle}`}>{nota}</p>}
    </div>
  );
}

// Una pregunta de opción: barras con el porcentaje de cada opción.
function ResultadoOpciones({ pregunta, escalaBase }) {
  const filas = (pregunta.opciones ?? []).map((opcion) => ({
    etiqueta: opcion.texto,
    conteo: opcion.conteo,
    porcentaje: opcion.porcentaje,
  }));

  const respuestaVacia = pregunta.respuestas === 0;

  // En opción múltiple el porcentaje no es sobre el total de respuestas, sino
  // sobre quienes marcaron algo, y la suma puede pasar de 100. Sin este texto
  // el admin lee la gráfica como si le faltaran o sobraran respuestas.
  const notaBase = escalaBase
    ? `${pregunta.respondientes} de ${pregunta.respuestas} respondientes contestaron esta pregunta`
    : `${pregunta.respuestas} ${pregunta.respuestas === 1 ? 'respuesta' : 'respuestas'}`;

  return (
    <Tarjeta
      titulo={pregunta.texto}
      extra={
        <div className="flex items-center gap-2 shrink-0">
          <Badge texto={etiquetaTipoPregunta(pregunta.tipo)} color="blue" />
          {!pregunta.es_visible && <Badge texto="Oculta" color="slate" />}
        </div>
      }
    >
      {respuestaVacia ? (
        <p className="text-sm opacity-60 py-6 text-center">Nadie respondió esta pregunta todavía.</p>
      ) : (
        <>
          <GraficaBarras filas={filas} />
          <p className="text-[11px] opacity-60 mt-3">{notaBase}</p>
        </>
      )}
    </Tarjeta>
  );
}

// Una escala: el promedio arriba y el eje completo abajo.
function ResultadoEscala({ pregunta }) {
  const { tema } = useTheme();

  const filas = (pregunta.distribucion ?? []).map((valor) => ({
    etiqueta: String(valor.valor),
    conteo: valor.conteo,
    porcentaje: valor.porcentaje,
  }));

  // Las etiquetas de los extremos van en el pie: son opcionales y el admin las
  // escribió al armar la encuesta, así que interesa verlas junto al eje.
  const rango = `${pregunta.escala_min} a ${pregunta.escala_max}`;

  return (
    <Tarjeta
      titulo={pregunta.texto}
      extra={<Badge texto={etiquetaTipoPregunta(pregunta.tipo)} color="blue" />}
    >
      {pregunta.respuestas === 0 ? (
        <p className="text-sm opacity-60 py-6 text-center">Nadie respondió esta pregunta todavía.</p>
      ) : (
        <>
          <div className="flex items-end gap-3 mb-4">
            <p className={`text-3xl font-black ${tema.title}`}>
              {pregunta.promedio ?? '—'}
            </p>
            <p className={`text-xs pb-1 ${tema.subtitle}`}>
              promedio de {pregunta.respuestas}{' '}
              {pregunta.respuestas === 1 ? 'respuesta' : 'respuestas'} · rango {rango}
            </p>
          </div>

          <GraficaBarras filas={filas} />

          {(pregunta.escala_min_texto || pregunta.escala_max_texto) && (
            <p className="text-[11px] opacity-60 mt-3">
              {pregunta.escala_min_texto ? `${pregunta.escala_min} = ${pregunta.escala_min_texto}` : `${pregunta.escala_min}`}
              {' · '}
              {pregunta.escala_max_texto ? `${pregunta.escala_max} = ${pregunta.escala_max_texto}` : `${pregunta.escala_max}`}
            </p>
          )}
        </>
      )}
    </Tarjeta>
  );
}

// Texto libre: no hay distribución que graficar, así que se lista la muestra.
function ResultadoTextos({ pregunta }) {
  const { tema } = useTheme();

  return (
    <Tarjeta
      titulo={pregunta.texto}
      extra={<Badge texto={etiquetaTipoPregunta(pregunta.tipo)} color="blue" />}
    >
      {pregunta.total_textos === 0 ? (
        <p className="text-sm opacity-60 py-6 text-center">Nadie escribió en esta pregunta.</p>
      ) : (
        <>
          <p className={`text-[11px] ${tema.subtitle} mb-3`}>
            {pregunta.total_textos}{' '}
            {pregunta.total_textos === 1 ? 'respuesta' : 'respuestas'} en total
            {pregunta.truncados &&
              ` · se muestran las ${pregunta.textos.length} más recientes de ${pregunta.limite_textos} que trae la respuesta`}
          </p>

          <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {pregunta.textos.map((texto, i) => (
              <li
                key={`${pregunta.id_pregunta}-${i}`}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
              >
                <p className="text-sm whitespace-pre-wrap break-words">{texto.texto}</p>
                <p className={`text-[10px] ${tema.subtitle} mt-1`}>
                  {new Date(texto.fecha).toLocaleString('es-MX')}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Tarjeta>
  );
}

export function PanelResultados({ cargando, resultados, alVolver }) {
  const { tema } = useTheme();

  if (cargando) return <Spinner size="md" />;

  if (!resultados) {
    return (
      <EmptyState
        icono="clipboard"
        titulo="No se pudieron cargar los resultados"
        descripcion="Intenta de nuevo."
      />
    );
  }

  const { encuesta, total_respuestas: total, por_fecha: porFecha, por_licenciatura: porLicenciatura, sin_licenciatura: sinLicenciatura, preguntas } =
    resultados;

  const sinRespuestas = total === 0;

  return (
    <div className="space-y-5">
      <Tarjeta
        titulo={encuesta.titulo}
        extra={
          <button
            onClick={alVolver}
            className="text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 cursor-pointer"
          >
            Volver
          </button>
        }
      >
        {sinRespuestas ? (
          <Alerta
            tipo="info"
            mensaje="Esta encuesta todavía no tiene respuestas."
          >
            <p className="text-xs mt-1 opacity-80">
              Compártela para empezar a recibir respuestas. Mientras tanto no hay nada que
              graficar, y los agregados de abajo salen en cero.
            </p>
          </Alerta>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <Metrica etiqueta="Respuestas totales" valor={total} />
            <Metrica
              etiqueta="Por día"
              valor={porFecha.length}
              nota={porFecha.length === 1 ? porFecha[0].dia : `${porFecha[0]?.dia} → ${porFecha[porFecha.length - 1]?.dia}`}
            />
            <Metrica etiqueta="Programas" valor={porLicenciatura.length} />
            <Metrica
              etiqueta="Sin programa"
              valor={sinLicenciatura}
              nota="no dijeron cuál"
            />
          </div>
        )}
      </Tarjeta>

      {porFecha.length > 1 && (
        <Tarjeta titulo="Respuestas por día">
          <ul className="space-y-1">
            {porFecha.map((dia) => (
              <li key={dia.dia} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 opacity-70">{dia.dia}</span>
                <span className="flex-1 h-2 rounded-full bg-amber-400/20 overflow-hidden">
                  <span
                    className="block h-full bg-amber-400 rounded-full"
                    style={{ width: `${(dia.respuestas / total) * 100}%` }}
                  />
                </span>
                <span className="w-10 text-right font-bold">{dia.respuestas}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {porLicenciatura.length > 0 && (
        <Tarjeta titulo="Respuestas por programa">
          <ul className="space-y-1">
            {porLicenciatura.map((fila) => (
              <li key={fila.id_licenciatura} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate opacity-80">{fila.nombre}</span>
                <span className="flex-1 h-2 rounded-full bg-amber-400/20 overflow-hidden max-w-48">
                  <span
                    className="block h-full bg-amber-400 rounded-full"
                    style={{ width: `${(fila.respuestas / total) * 100}%` }}
                  />
                </span>
                <span className="w-10 text-right font-bold">{fila.respuestas}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <div className="space-y-4">
        {preguntas.map((pregunta) => {
          if (pregunta.tipo === 'escala') return <ResultadoEscala key={pregunta.id_pregunta} pregunta={pregunta} />;
          if (pregunta.tipo === 'texto_corto' || pregunta.tipo === 'texto_largo')
            return <ResultadoTextos key={pregunta.id_pregunta} pregunta={pregunta} />;
          return (
            <ResultadoOpciones
              key={pregunta.id_pregunta}
              pregunta={pregunta}
              escalaBase={pregunta.tipo === 'opcion_multiple'}
            />
          );
        })}
      </div>

      {/* Sin esto el admin ve el total de arriba y las gráficas abajo sin ninguna
          pista de que la respuesta es anónima por diseño. */}
      <p className={`text-[11px] ${tema.subtitle} text-center`}>
        Las respuestas son anónimas: la encuesta no guarda nombre ni matrícula, sólo el
        programa que el alumno eligió. Por eso no se puede identificar a quién respondió.
      </p>
    </div>
  );
}
