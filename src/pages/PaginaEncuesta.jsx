// Pantalla pública de la encuesta, en /encuesta/:slug.
//
// No pide sesión y por eso NO va dentro de RutaProtegida. Es la única pantalla
// a la que se entra sin logearse, junto al modal de login del catálogo, así que
// App.jsx la monta fuera del layout con navbar para que un alumno que nunca ha
// entrado a la plataforma no vea menús que no puede usar.
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { encuestaService } from '../services/encuesta.service';
import { useLicenciaturas } from '../hooks/useLicenciaturas';
import { CampoPregunta } from '../components/encuestas/CampoPregunta';

// El backend distingue tres casos y cada uno merece su pantalla: 404 (el enlace
// no existe), 403 (todavía no abrió) y 410 (ya cerró). Ver errorStatus().
export default function PaginaEncuesta() {
  const { slug } = useParams();

  const [encuesta, setEncuesta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [respuestas, setRespuestas] = useState({});
  const [idLicenciatura, setIdLicenciatura] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const { licenciaturas, loading: cargandoCatalogos } = useLicenciaturas();

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

      const v = respuestas[p.id_pregunta];
      const vacio =
        v === undefined ||
        v === null ||
        v === '' ||
        (Array.isArray(v) && v.length === 0);

      if (vacio) {
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
        id_licenciatura: idLicenciatura === '' ? null : Number(idLicenciatura),
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b111e] text-slate-800 dark:text-slate-200 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {encuesta.titulo}
          </h1>
          {encuesta.descripcion && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {encuesta.descripcion}
            </p>
          )}
          {encuesta.fecha_fin && (
            <p className="mt-2 text-xs text-slate-500">
              Cierra el {new Date(encuesta.fecha_fin).toLocaleDateString('es-MX')}
            </p>
          )}
        </header>

        <form onSubmit={manejarEnvio} className="space-y-6" noValidate>
          {encuesta.preguntas.map((pregunta, i) => (
            <section
              key={pregunta.id_pregunta}
              id={`pregunta-${pregunta.id_pregunta}`}
              className={`rounded-xl border p-5 bg-white dark:bg-[#0e162c] ${
                errores[pregunta.id_pregunta]
                  ? 'border-red-400 dark:border-red-500/60'
                  : 'border-slate-200 dark:border-slate-700/50'
              }`}
            >
              <h2 className="font-bold text-slate-900 dark:text-white">
                <span className="text-slate-400 mr-2">{i + 1}.</span>
                {pregunta.texto}
                {pregunta.es_obligatoria && (
                  <span className="ml-2 text-red-500 text-sm">*</span>
                )}
              </h2>

              {pregunta.ayuda && (
                <p className="mt-1 text-xs text-slate-500">{pregunta.ayuda}</p>
              )}

              <div className="mt-3">
                <CampoPregunta
                  pregunta={pregunta}
                  valor={respuestas[pregunta.id_pregunta]}
                  onChange={(v) => cambiarRespuesta(pregunta.id_pregunta, v)}
                  error={errores[pregunta.id_pregunta]}
                  deshabilitado={enviando}
                />
              </div>

              {errores[pregunta.id_pregunta] && (
                <p className="mt-2 text-sm text-red-500">
                  {errores[pregunta.id_pregunta]}
                </p>
              )}
            </section>
          ))}

          <section className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-5 bg-white dark:bg-[#0e162c]">
            <label className="block text-sm font-bold text-slate-900 dark:text-white">
              Tu licenciatura
              <span className="block mt-1 text-xs font-normal text-slate-500">
                Opcional. Sólo se usa para comparar resultados entre programas.
              </span>
            </label>

            <select
              value={idLicenciatura}
              onChange={(e) => setIdLicenciatura(e.target.value)}
              disabled={cargandoCatalogos || enviando}
              className="mt-2 w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-[#18223f] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option value="">
                {cargandoCatalogos ? 'Cargando...' : 'Prefiero no decir'}
              </option>
              {licenciaturas.map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </section>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-amber-400 px-6 py-3.5 font-black text-[#0e162c] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? 'Enviando...' : 'Enviar respuestas'}
          </button>

          <p className="text-center text-xs text-slate-500">
            Esta encuesta es anónima: no se guarda tu nombre ni tu matrícula.
          </p>
        </form>
      </div>
    </div>
  );
}

function PantallaCarga() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b111e] flex items-center justify-center">
      <p className="text-sm text-slate-500">Cargando encuesta...</p>
    </div>
  );
}

// El status decide el texto: 'no disponible', 'cerrada' y 'no existe' son
// finales distintos y confundir al alumno con un error genérico hace que pida
// ayuda por algo que ya no tiene solución.
function PantallaError({ error, onReintentar }) {
  const status = error?.status;
  const titulo =
    status === 410 ? 'Esta encuesta ya se cerró'
    : status === 403 ? 'Esta encuesta todavía no está disponible'
    : 'Encuesta no encontrada';

  const detalle =
    status === 410 ? 'Gracias por tu interés, pero el periodo de respuestas terminó.'
    : status === 403 ? 'Vuelve más tarde, cuando se abra el periodo de respuestas.'
    : 'Revisa el enlace que te compartieron. Es posible que esté mal copiado.';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b111e] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">{titulo}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{detalle}</p>

        {status !== 410 && (
          <button
            onClick={onReintentar}
            className="mt-6 rounded-lg bg-amber-400 px-5 py-2.5 font-bold text-[#0e162c] hover:opacity-90"
          >
            Reintentar
          </button>
        )}

        <p className="mt-6 text-sm">
          <Link to="/" className="text-amber-500 hover:underline">
            Ir al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}

function PantallaGracias({ encuesta }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b111e] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-4xl">✓</div>
        <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
          {encuesta.mensaje_agradecimiento || '¡Gracias por responder!'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Tus respuestas se guardaron de forma anónima.
        </p>
      </div>
    </div>
  );
}
