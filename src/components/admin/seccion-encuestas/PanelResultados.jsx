// Resultados de una encuesta.
//
// Todo lo que se muestra aquí llega ya agregado desde
// `GET /encuestas/admin/:id/resultados`. Este componente no consulta ni cuenta
// nada: sólo presenta. Esa separación es a propósito, porque el promedio de una
// escala tiene que ponderar por cuántas respuestas hay de cada valor y eso es
// mucho más fácil de hacer mal dos veces.
import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { Badge } from '../../ui/Badge';
import { BotonAccion } from '../../ui/BotonAccion';
import { Icono } from '../../ui/Icono';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { Spinner } from '../../ui/Spinner';
import { EmptyState } from '../../ui/EmptyState';
import { GraficaBarras } from './GraficaBarras';
import { etiquetaTipoPregunta } from '../../../constants/encuesta';
import { infoEstadoEncuesta } from '../../../constants/estatus';
import { enlacePublicoEncuesta, textoVigenciaEncuesta } from '../../../utils/encuesta';

// Respuestas por debajo de las cuales los porcentajes no significan gran cosa.
const UMBRAL_REPRESENTATIVO = 30;

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

/**
 * Una cifra del resumen.
 *
 * `texto` cambia el tratamiento: la vigencia es una frase ("cierra en 3 días")
 * y a tamaño de cifra gigante se leería como un número enorme y sin sentido.
 */
function Metrica({ etiqueta, valor, nota, texto }) {
  const { tema } = useTheme();

  return (
    <div>
      <p
        className={
          texto
            ? `text-sm font-black leading-snug ${tema.title}`
            : `text-3xl font-black ${tema.title}`
        }
      >
        {valor}
      </p>
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
      extra={<Badge texto={etiquetaTipoPregunta(pregunta.tipo)} color="blue" />}
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
const TEXTOS_POR_PAGINA = 20;

function ResultadoTextos({ pregunta }) {
  const { tema, modoOscuro } = useTheme();
  const [pagina, setPagina] = useState(0);

  const textos = pregunta.textos ?? [];
  const totalPaginas = Math.max(1, Math.ceil(textos.length / TEXTOS_POR_PAGINA));

  const paginaSegura = Math.min(pagina, totalPaginas - 1);
  const visibles = textos.slice(
    paginaSegura * TEXTOS_POR_PAGINA,
    paginaSegura * TEXTOS_POR_PAGINA + TEXTOS_POR_PAGINA
  );

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

          <ul className="space-y-2">
            {visibles.map((texto, i) => (
              <li
                key={`${pregunta.id_pregunta}-${paginaSegura * TEXTOS_POR_PAGINA + i}`}
                className={`rounded-lg border px-3 py-2 ${
                  modoOscuro ? 'border-slate-700' : 'border-slate-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{texto.texto}</p>
                <p className={`text-[10px] ${tema.subtitle} mt-1`}>
                  {new Date(texto.fecha).toLocaleString('es-MX')}
                </p>
              </li>
            ))}
          </ul>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-3 mt-3">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaSegura === 0}
                className="inline-flex items-center gap-1 text-xs font-bold opacity-70 hover:opacity-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
              >
                <Icono nombre="chevron-left" className="h-3.5 w-3.5" />
                Anterior
              </button>

              <span className={`text-[11px] ${tema.subtitle}`}>
                Página {paginaSegura + 1} de {totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaSegura >= totalPaginas - 1}
                className="inline-flex items-center gap-1 text-xs font-bold opacity-70 hover:opacity-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
                <Icono nombre="chevron-right" className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </Tarjeta>
  );
}

// ─── Selector de carrera ─────────────────────────────────────────────────────
//
// Se construye a partir de `por_licenciatura` que ya viene en la respuesta de
// resultados: no necesita una llamada extra al catálogo. Cuando se selecciona
// una carrera, recarga los resultados con `?carrera=<id>`.

function FiltroCarrera({ porLicenciatura, carreraActiva, onChange, tema, modoOscuro }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label
        htmlFor="filtro-carrera"
        className={`text-xs font-bold uppercase tracking-wider ${tema.subtitle}`}
      >
        <Icono nombre="filter" className="h-3.5 w-3.5 inline mr-1" />
        Filtrar por carrera
      </label>
      <select
        id="filtro-carrera"
        value={carreraActiva ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className={`border rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer ${
          modoOscuro
            ? 'border-slate-700 bg-[#18223f] text-white'
            : 'border-slate-300 bg-white text-slate-900'
        }`}
      >
        <option value="">Todas las carreras</option>
        {porLicenciatura.map((lic) => (
          <option key={lic.id_licenciatura} value={lic.id_licenciatura}>
            {lic.nombre} ({lic.respuestas})
          </option>
        ))}
      </select>
      {carreraActiva && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-bold text-amber-500 hover:text-amber-400 cursor-pointer"
        >
          ✕ Quitar filtro
        </button>
      )}
    </div>
  );
}

export function PanelResultados({ hook, cargando, resultados }) {
  const { tema, modoOscuro } = useTheme();
  const { esAdmin, aplicarEstado, refrescarSeleccion, cargarResultados, enviando } = hook;

  const [copiado, setCopiado] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [carreraActiva, setCarreraActiva] = useState(null);

  // Guardar la lista completa de licenciaturas antes de filtrar para que el
  // <select> siempre muestre todas las opciones, no solo las del filtro activo.
  const [licenciaturasTodas, setLicenciaturasTodas] = useState(null);

  const enlace = enlacePublicoEncuesta(hook.seleccion?.slug ?? resultados?.encuesta?.slug);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  // Cuando llegan resultados sin filtro, guardar las licenciaturas completas.
  if (resultados?.por_licenciatura && !carreraActiva && licenciaturasTodas !== resultados.por_licenciatura) {
    setLicenciaturasTodas(resultados.por_licenciatura);
  }

  const handleCambiarCarrera = async (idCarrera) => {
    setCarreraActiva(idCarrera);
    const encuestaId = hook.seleccion?.id_encuesta ?? resultados?.encuesta?.id_encuesta;
    if (encuestaId) {
      await cargarResultados(encuestaId, idCarrera);
    }
  };

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

  const { encuesta: encuestaResultados, total_respuestas: total, por_fecha: porFecha, por_licenciatura: porLicenciatura, sin_licenciatura: sinLicenciatura, preguntas } =
    resultados;

  const encuesta = hook.seleccion ?? encuestaResultados;

  const sinRespuestas = total === 0;
  const infoEstado = infoEstadoEncuesta(encuesta.estado);

  // Las licenciaturas para el <select>: las completas si las tenemos, o las del
  // resultado actual como fallback.
  const licenciaturasParaFiltro = licenciaturasTodas ?? porLicenciatura;

  // Nombre de la carrera filtrada, para mostrar en la cabecera.
  const nombreCarreraActiva = carreraActiva
    ? licenciaturasParaFiltro.find((l) => l.id_licenciatura === carreraActiva)?.nombre
    : null;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className={`text-xl font-black break-words ${tema.title}`}>{encuesta.titulo}</h2>
          <Badge texto={infoEstado.etiqueta} color={infoEstado.color} />
        </div>

        {esAdmin && encuesta.estado === 'publicada' && (
          <BotonAccion
            variant="outline"
            size="sm"
            onClick={() => setCerrando(true)}
            disabled={enviando}
          >
            <Icono nombre="lock" className="h-3.5 w-3.5" />
            Cerrar encuesta
          </BotonAccion>
        )}
      </div>

      {/* Enlace público */}
      {encuesta.estado === 'publicada' && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={enlace}
            aria-label="Enlace público de la encuesta"
            onFocus={(e) => e.target.select()}
            className={`border rounded-lg px-3 py-2 text-xs flex-1 min-w-0 cursor-text ${
              modoOscuro
                ? 'border-slate-700 bg-[#18223f] text-white'
                : 'border-slate-300 bg-white text-slate-900'
            }`}
          />
          <BotonAccion variant="outline" size="sm" onClick={copiar} disabled={enviando}>
            <Icono nombre={copiado ? 'check' : 'clipboard'} className="h-3.5 w-3.5" />
            {copiado ? 'Copiado' : 'Copiar'}
          </BotonAccion>
        </div>
      )}

      {/* ── Filtro por carrera ──────────────────────────────────────────── */}
      {licenciaturasParaFiltro.length > 0 && (
        <FiltroCarrera
          porLicenciatura={licenciaturasParaFiltro}
          carreraActiva={carreraActiva}
          onChange={handleCambiarCarrera}
          tema={tema}
          modoOscuro={modoOscuro}
        />
      )}

      {/* Indicador de filtro activo */}
      {nombreCarreraActiva && (
        <Alerta tipo="info" mensaje={`Mostrando resultados filtrados por: ${nombreCarreraActiva}`}>
          <p className="text-xs mt-1 opacity-80">
            Los porcentajes y conteos de abajo corresponden sólo a las respuestas de esta carrera.
          </p>
        </Alerta>
      )}

      {/* ── Resumen ──────────────────────────────────────────────────── */}
      <Tarjeta>
        {sinRespuestas ? (
          <Alerta
            tipo="info"
            mensaje={carreraActiva
              ? 'No hay respuestas de esta carrera.'
              : 'Esta encuesta todavía no tiene respuestas.'}
          >
            <p className="text-xs mt-1 opacity-80">
              {carreraActiva
                ? 'Prueba quitando el filtro para ver los resultados generales.'
                : 'Compártela para empezar a recibir respuestas. Mientras tanto no hay nada que graficar, y los agregados de abajo salen en cero.'}
            </p>
          </Alerta>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
            <Metrica etiqueta="Respuestas" valor={total} />

            <Metrica etiqueta="Vigencia" valor={textoVigenciaEncuesta(encuesta)} texto />

            <Metrica etiqueta="Días con actividad" valor={porFecha.length} />
          </div>
        )}
      </Tarjeta>

      {/* Aviso de muestra pequeña */}
      {!sinRespuestas && total < UMBRAL_REPRESENTATIVO && (
        <p className={`text-[11px] ${tema.subtitle} flex items-start gap-1.5`}>
          <Icono nombre="info" className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>
            Con {total} {total === 1 ? 'respuesta' : 'respuestas'} los porcentajes todavía no
            son representativos: una más cambia el resultado de forma notable.
          </span>
        </p>
      )}

      {/* ── Respuestas por día ───────────────────────────────────────── */}
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

      {/* ── Quién respondió (por carrera) ────────────────────────────── */}
      {/* Sigue en pie aunque la encuesta tenga pregunta de licenciatura, y la
          tarjeta de esa pregunta muestre la misma gráfica. No es duplicado
          exacto: aquí el porcentaje va sobre todas las respuestas, y el de la
          pregunta sólo sobre quienes dijeron programa. Además esta es la única
          tarjeta que explica el `sin_licenciatura` de abajo. */}
      {!carreraActiva && porLicenciatura.length > 0 && (
        <Tarjeta titulo="Quién respondió">
          <GraficaBarras
            filas={porLicenciatura.map((fila) => ({
              etiqueta: fila.nombre,
              conteo: fila.respuestas,
              porcentaje: total > 0 ? Math.round((fila.respuestas / total) * 100) : 0,
            }))}
          />

          {sinLicenciatura > 0 && (
            <p className={`text-[11px] ${tema.subtitle} mt-3`}>
              {sinLicenciatura}{' '}
              {sinLicenciatura === 1 ? 'respuesta' : 'respuestas'} sin programa. Se omiten de la
              gráfica porque no hay un lugar al que atribuirlas: no se sabe a qué
              pertenecen.
            </p>
          )}
        </Tarjeta>
      )}

      {/* ── Preguntas ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {preguntas.map((pregunta) => {
          if (pregunta.tipo === 'escala') return <ResultadoEscala key={pregunta.id_pregunta} pregunta={pregunta} />;
          if (pregunta.tipo === 'texto_corto' || pregunta.tipo === 'texto_largo')
            return <ResultadoTextos key={pregunta.id_pregunta} pregunta={pregunta} />;
          // Aquí caen 'opcion_unica', 'opcion_multiple' y 'licenciatura'. Los
          // tres llegan con la misma forma (`opciones` con conteo y porcentaje) y
          // no hace falta que la gráfica sepa de qué tipo se trata. Para
          // `licenciatura` el backend la arma desde `por_licenciatura`.
          return (
            <ResultadoOpciones
              key={pregunta.id_pregunta}
              pregunta={pregunta}
              escalaBase={pregunta.tipo === 'opcion_multiple'}
            />
          );
        })}
      </div>

      {/* Nota de anonimato */}
      <p className={`text-[11px] ${tema.subtitle} text-center`}>
        Las respuestas son anónimas: la encuesta no guarda nombre ni matrícula, sólo el
        programa que el alumno eligió. Por eso no se puede identificar a quién respondió.
      </p>

      {/* Modal de cerrar encuesta */}
      <ModalConfirmacion
        show={cerrando}
        titulo="Cerrar encuesta"
        mensaje={`Al cerrar "${encuesta.titulo}" el enlace público dejará de recibir respuestas. Quien ya lo tenga abierto no podrá mandar la suya${
          total > 0 ? `, y se conservarán las ${total} respuestas que ya hay` : ''
        }. Si te equivocaste, puedes reabrirla desde el editor cambiando el estado a Publicada.`}
        textoConfirmar="Cerrar encuesta"
        cargando={enviando}
        onConfirmar={async () => {
          setCerrando(false);
          await aplicarEstado(encuesta.id_encuesta, 'cerrada');
          await refrescarSeleccion(encuesta.id_encuesta);
          await cargarResultados(encuesta.id_encuesta);
        }}
        onCancelar={() => setCerrando(false)}
      />
    </div>
  );
}
