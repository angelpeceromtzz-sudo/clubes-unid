// Pantalla pública de la encuesta, en /encuesta/:slug.
//
// No pide sesión y por eso NO va dentro de RutaProtegida. Es la única pantalla
// a la que se entra sin logearse, junto al modal de login del catálogo, así que
// App.jsx la monta fuera del layout con navbar para que un alumno que nunca ha
// entrado a la plataforma no vea menús que no puede usar.
//
// Las cuatro pantallas (formulario, carga, error y gracias) se pintan dentro
// de FondoEncuesta, que pone el color de tema y la marca de agua lobounid.png
// detrás del contenido. El aspecto (hero, barra de progreso, tarjetas con chip
// numérico, botón con gradiente) es puro Tailwind en este archivo: la lógica de
// respuestas, validación y envío no cambió con el rediseño.
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { encuestaService } from '../services/encuesta.service';
import { CampoPregunta } from '../components/encuestas/CampoPregunta';
import { FondoEncuesta } from '../components/encuestas/FondoEncuesta';
import { numerosVisibles } from '../utils/encuesta';
import { useTheme } from '../contexts/ThemeContext';
import { Icono } from '../components/ui/Icono';
import { Spinner } from '../components/ui/Spinner';

// Misma regla de "vacío" que usa validar(): la barra de progreso y el ✓ de
// cada tarjeta tienen que contar exactamente lo que el envío va a aceptar, o
// el alumno llegaría al 100% y recibiría "obligatoria" al enviar.
function respuestaVacia(valor) {
  return (
    valor === undefined ||
    valor === null ||
    valor === '' ||
    (Array.isArray(valor) && valor.length === 0)
  );
}

// El backend distingue tres casos y cada uno merece su pantalla: 404 (el enlace
// no existe), 403 (todavía no abrió) y 410 (ya cerró). Ver PantallaError().
export default function PaginaEncuesta() {
  const { slug } = useParams();
  const { tema, cardCls, modoOscuro } = useTheme();

  const [encuesta, setEncuesta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [respuestas, setRespuestas] = useState({});
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // El programa ya no es un bloque aparte: es una pregunta de tipo
  // 'licenciatura' dentro de `preguntas`, con su sitio en el orden que le haya
  // dado el admin. Su respuesta viaja en `respuestas` igual que las demás.

  // `cargando` arranca en true y `cargar` NO pone el spinner al entrar: si lo
  // hiciera, el effect haría setState de forma síncrona y React avisa de
  // render en cascada. El reinicio del spinner va en reintentar(), que es un
  // click del usuario.
  const cargar = useCallback(async () => {
    try {
      const datos = await encuestaService.obtenerPublica(slug);
      setEncuesta(datos);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }, [slug]);

  useEffect(() => {
    // Descarga de datos remotos, que es justamente el caso que la regla marca:
    // aquí no hay ningún setState síncrono, los tres están tras un await. El
    // linter no alcanza a ver eso y lo reporta igual. Mismo disable que en
    // usePanelAdmin y usePanelRectoria.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar().catch(() => {});
  }, [cargar]);

  function reintentar() {
    setCargando(true);
    setError(null);
    cargar().catch(() => {});
  }

  function cambiarRespuesta(idPregunta, valor) {
    setRespuestas((previas) => ({ ...previas, [idPregunta]: valor }));
    // El error de esa pregunta desaparece en cuanto se toca: reprovar todo en
    // cada tecla hace que el mensaje sea más molesto que útil. Se reconstruye el
    // objeto en vez de desestructurar, porque la clave es dinámica y dejarla en
    // una variable "_" dispara el aviso de variable sin usar.
    setErrores((previos) =>
      Object.fromEntries(Object.entries(previos).filter(([k]) => k !== String(idPregunta)))
    );
  }

  function validar() {
    const nuevos = {};

    for (const p of encuesta.preguntas) {
      if (!p.es_obligatoria) continue;

      if (respuestaVacia(respuestas[p.id_pregunta])) {
        nuevos[p.id_pregunta] = 'Esta pregunta es obligatoria';
      }
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function manejarEnvio(e) {
    e.preventDefault();

    if (!validar()) {
      // Lleva al primer error en vez de sólo marcarlo: con 20 preguntas el
      // alumno no sabe cuál le falta.
      document.getElementById(`pregunta-${Object.keys(errores)[0]}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setEnviando(true);
    try {
      await encuestaService.enviarRespuestas(slug, {
        respuestas: encuesta.preguntas
          .filter((p) => respuestas[p.id_pregunta] !== undefined)
          .map((p) => ({
            id_pregunta: p.id_pregunta,
            valor: respuestas[p.id_pregunta],
          })),
      });
      setEnviado(true);
      // Sin location.reload(): recargar tiraría los avisos y el scroll. Sólo
      // hace falta limpiar, porque la pantalla de gracias reemplaza el form.
      setRespuestas({});
    } catch (err) {
      // El 429 del rate limit y el 410 de encuesta cerrada llegan hasta aquí.
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <PantallaCarga />;
  if (error) return <PantallaError error={error} onReintentar={reintentar} />;
  if (!encuesta) return null;

  if (enviado) return <PantallaGracias encuesta={encuesta} />;

  // La licenciatura no lleva número y el contador no cuenta con ella: el helper
  // está en utils porque la vista previa del panel tiene que numerar igual.
  const numeros = numerosVisibles(encuesta.preguntas);

  // Progreso con la misma regla que validar(), más un caso: una licenciatura no
  // obligatoria tocada y dejada en "Prefiero no decir" (null) sí cuenta como
  // respondida, porque el alumno ya tomó una decisión y el envío la acepta. Sin
  // eso, esa pregunta dejaría la barra pegada en 99% sin manera de completarla.
  const respondidas = encuesta.preguntas.filter((p) => {
    const v = respuestas[p.id_pregunta];
    const tocada = Object.prototype.hasOwnProperty.call(respuestas, p.id_pregunta);
    return (
      !respuestaVacia(v) || (tocada && v === null && !p.es_obligatoria)
    );
  }).length;
  const totalPreguntas = encuesta.preguntas.length;
  const porcentaje = totalPreguntas > 0
    ? Math.round((respondidas / totalPreguntas) * 100)
    : 0;

  return (
    <FondoEncuesta>
      <div className="min-h-screen py-10 px-4 sm:py-14">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8 text-center sm:text-left">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-500">
              <Icono nombre="clipboard" className="h-3.5 w-3.5" strokeWidth={2.5} />
              Encuesta anónima
            </p>

            <h1 className={`mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-tight ${tema.title}`}>
              {encuesta.titulo}
            </h1>

            {encuesta.descripcion && (
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                {encuesta.descripcion}
              </p>
            )}

            {encuesta.fecha_fin && (
              <p
                className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${tema.subtitle} ${
                  modoOscuro ? 'border-slate-700 bg-[#0e162c]' : 'border-slate-200 bg-white'
                }`}
              >
                <Icono nombre="calendar" className="h-3.5 w-3.5 text-amber-500" strokeWidth={2} />
                Cierra el {new Date(encuesta.fecha_fin).toLocaleDateString('es-MX')}
              </p>
            )}
          </header>

          {totalPreguntas > 0 && (
            // `sticky` mantiene la barra visible al hacer scroll: en encuestas
            // largas el alumno pierde de vista cuánto lleva y la barra quedaba
            // arriba, fuera de pantalla. El fondo es sólido (cardCls), así que
            // el contenido pasa por debajo sin transparentarse; z-20 la deja
            // por encima de las tarjetas dentro del contenedor z-10.
            <div
              className={`${cardCls} sticky top-3 z-20 rounded-2xl border p-4 sm:p-5 mb-6 ring-1 ring-black/5`}
            >
              <div className="flex items-center justify-between gap-3 mb-2 text-xs font-bold">
                <span className={tema.subtitle}>Tu progreso</span>
                <span className="text-amber-500 tabular-nums">
                  {respondidas} de {totalPreguntas} respondidas
                </span>
              </div>
              <div
                className={`h-2 rounded-full overflow-hidden ${modoOscuro ? 'bg-slate-700/60' : 'bg-slate-200'}`}
                role="progressbar"
                aria-valuenow={porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso de la encuesta"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          )}

          <form onSubmit={manejarEnvio} className="space-y-5" noValidate>
            {encuesta.preguntas.map((pregunta, i) => {
              const conError = errores[pregunta.id_pregunta];
              // El ✓ se muestra sólo si esa pregunta en particular tiene
              // respuesta, no si el formulario es válido en general.
              const respondida =
                !respuestaVacia(respuestas[pregunta.id_pregunta]) ||
                (Object.prototype.hasOwnProperty.call(respuestas, pregunta.id_pregunta) &&
                  respuestas[pregunta.id_pregunta] === null &&
                  !pregunta.es_obligatoria);

              return (
                <section
                  key={pregunta.id_pregunta}
                  id={`pregunta-${pregunta.id_pregunta}`}
                  className={`anim-entrada ${cardCls} rounded-2xl border p-5 sm:p-6 scroll-mt-28 ${
                    conError
                      ? modoOscuro
                        ? 'border-red-500/60 ring-2 ring-red-500/20'
                        : 'border-red-400 ring-2 ring-red-500/20'
                      : ''
                  }`}
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {/* `null` es la pregunta de licenciatura, que va sin número.
                        El chip se llena de ámbar cuando la pregunta ya tiene
                        respuesta para que el alumno vea de un vistazo qué le falta. */}
                    {numeros[i] !== null && (
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                          respondida
                            ? 'bg-amber-400 text-[#0e162c]'
                            : 'bg-amber-400/15 text-amber-500'
                        }`}
                        aria-hidden="true"
                      >
                        {numeros[i]}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className={`font-bold leading-snug ${tema.title}`}>
                        {pregunta.texto}
                        {pregunta.es_obligatoria && (
                          <span className="ml-1 text-red-500" title="Obligatoria">*</span>
                        )}
                        {respondida && (
                          <Icono
                            nombre="check"
                            className="ml-2 inline-block h-4 w-4 -translate-y-0.5 text-amber-500"
                            strokeWidth={3}
                          />
                        )}
                      </h2>

                      {pregunta.ayuda && (
                        <p className={`mt-1 text-xs ${tema.subtitle}`}>{pregunta.ayuda}</p>
                      )}

                      <div className="mt-3.5">
                        <CampoPregunta
                          pregunta={pregunta}
                          valor={respuestas[pregunta.id_pregunta]}
                          onChange={(v) => cambiarRespuesta(pregunta.id_pregunta, v)}
                          error={conError}
                          deshabilitado={enviando}
                        />
                      </div>

                      {conError && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-500">
                          <Icono nombre="alert-circle" className="h-4 w-4 shrink-0" strokeWidth={2} />
                          {conError}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-4 text-base font-black text-[#0e162c] shadow-lg shadow-amber-400/25 transition-all hover:from-amber-300 hover:to-amber-400 hover:shadow-xl hover:shadow-amber-400/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {enviando ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0e162c] border-t-transparent" />
                  Enviando...
                </span>
              ) : (
                'Enviar respuestas'
              )}
            </button>

            <p className={`flex items-center justify-center gap-1.5 text-center text-xs ${tema.subtitle}`}>
              <Icono nombre="lock" className="h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2} />
              Esta encuesta es anónima: no se guarda tu nombre ni tu matrícula.
            </p>
          </form>
        </div>
      </div>
    </FondoEncuesta>
  );
}

function PantallaCarga() {
  const { tema } = useTheme();
  return (
    <FondoEncuesta>
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <Spinner size="md" />
        <p className={`text-sm font-semibold ${tema.subtitle}`}>Cargando encuesta...</p>
      </div>
    </FondoEncuesta>
  );
}

// El status decide el texto: 'no disponible', 'cerrada' y 'no existe' son
// finales distintos y confundir al alumno con un error genérico hace que pida
// ayuda por algo que ya no tiene solución.
function PantallaError({ error, onReintentar }) {
  const { tema, modoOscuro } = useTheme();
  const status = error?.status;
  const titulo =
    status === 410 ? 'Esta encuesta ya se cerró'
    : status === 403 ? 'Esta encuesta todavía no está disponible'
    : 'Encuesta no encontrada';

  const detalle =
    status === 410 ? 'Gracias por tu interés, pero el periodo de respuestas terminó.'
    : status === 403 ? 'Vuelve más tarde, cuando se abra el periodo de respuestas.'
    : 'Revisa el enlace que te compartieron. Es posible que esté mal copiado.';

  const icono = status === 410 ? 'clock' : status === 403 ? 'info' : 'help';

  return (
    <FondoEncuesta>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div
            className={`anim-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              modoOscuro ? 'bg-amber-400/15' : 'bg-amber-100'
            }`}
          >
            <Icono nombre={icono} className="h-8 w-8 text-amber-500" strokeWidth={1.8} />
          </div>

          <h1 className={`mt-5 text-xl font-black ${tema.title}`}>{titulo}</h1>
          <p className={`mt-2 text-sm ${tema.subtitle}`}>{detalle}</p>

          {status !== 410 && (
            <button
              onClick={onReintentar}
              className="mt-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 font-black text-[#0e162c] shadow-lg shadow-amber-400/25 transition-all hover:from-amber-300 hover:to-amber-400 hover:shadow-xl hover:shadow-amber-400/40 active:scale-[0.98]"
            >
              Reintentar
            </button>
          )}

          <p className="mt-6 text-sm">
            <Link to="/" className="font-semibold text-amber-500 hover:underline">
              Ir al inicio
            </Link>
          </p>
        </div>
      </div>
    </FondoEncuesta>
  );
}

function PantallaGracias({ encuesta }) {
  const { tema } = useTheme();
  return (
    <FondoEncuesta>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          {/* El check va dentro de un círculo con el gradiente de la identidad:
              como texto suelto heredaba el color del fondo y en modo oscuro
              desaparecía. El `text-[#0e162c]` es el navy que se usa sobre
              ámbar en todo el sitio para mantener contraste. */}
          <div className="anim-pop mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-xl shadow-amber-400/30">
            <Icono nombre="check" className="h-12 w-12 text-[#0e162c]" strokeWidth={3} />
          </div>

          <h1 className={`mt-6 text-2xl font-black ${tema.title}`}>
            {encuesta.mensaje_agradecimiento || '¡Gracias por responder!'}
          </h1>
          <p className={`mt-2 text-sm ${tema.subtitle}`}>
            Tus respuestas se guardaron de forma anónima.
          </p>
        </div>
      </div>
    </FondoEncuesta>
  );
}
