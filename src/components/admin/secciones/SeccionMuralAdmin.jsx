import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAutenticacion } from '../../../contexts/AuthContext';
import { useMural } from '../../../hooks/useMural';
import { muralService } from '../../../services/mural.service';
import { fechaHoyCampus, formatearFechaLegible } from '../../../utils/fechas';
import { estadoPublicacionMural, ESTADOS_MURAL } from '../../../utils/mural';
import { Icono } from '../../ui/Icono';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { EditorPublicacionMural } from '../../calendario/EditorPublicacionMural';
import { ModalDetalleCalendario } from '../../calendario/ModalDetalleCalendario';
import { QrMural } from '../../calendario/QrMural';

function Miniatura({ url, titulo }) {
  if (!url) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Icono nombre="image" className="h-6 w-6" />
      </div>
    );
  }
  return <img src={url} alt={titulo} className="h-16 w-16 shrink-0 rounded-lg object-cover" />;
}

export function SeccionMuralAdmin() {
  const { tema, cardCls, inputCls, selectCls, modoOscuro } = useTheme();
  const { usuario, esAdmin, esResponsableMural } = useAutenticacion();
  const esCoordinacion = esAdmin;
  const gestor = useMural(true);
  const [editor, setEditor] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [errorRevision, setErrorRevision] = useState('');
  const [errorDevolucion, setErrorDevolucion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [devolviendo, setDevolviendo] = useState(null);
  const [revisando, setRevisando] = useState(null);
  const hoy = fechaHoyCampus();
  const basePanel = `${esAdmin ? '/admin' : esResponsableMural ? '/mural' : '/rectoria'}/dashboard`;

  const lista = useMemo(() => gestor.publicaciones.filter((item) =>
    `${item.titulo} ${item.subtitulo || ''} ${item.contenido}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')) &&
    (estado === 'todos' || estadoPublicacionMural(item, hoy) === estado)), [gestor.publicaciones, busqueda, estado, hoy]);

  const pendientes = useMemo(() => gestor.publicaciones.filter((item) => item.status === 'pending'), [gestor.publicaciones]);

  function guardada(item) {
    gestor.incorporar(item);
    setMensaje(item.status === 'published' ? 'Publicación actualizada. Volverá a revisión para su nueva aprobación.' : 'Borrador guardado.');
  }

  async function enviarAprobacion(item) {
    if (enviando) return;
    setEnviando(true); setError(''); setMensaje('');
    try {
      const actualizada = await muralService.enviarAprobacion(item.id_publicacion);
      gestor.incorporar(actualizada);
      setMensaje('Publicación enviada a aprobación. Coordinación la revisará pronto.');
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  async function aprobar(item) {
    if (enviando) return;
    setEnviando(true); setError(''); setErrorRevision(''); setMensaje('');
    try {
      const actualizada = await muralService.aprobar(item.id_publicacion);
      gestor.incorporar(actualizada);
      setRevisando(null);
      setMensaje('Publicación aprobada y publicada en el mural.');
    } catch (err) {
      if (err.status === 409) {
        setRevisando(null);
        setError(err.message);
        gestor.cargar();
      } else {
        setErrorRevision(err.message);
      }
    }
    finally { setEnviando(false); }
  }

  function iniciarDevolucion(item) {
    setDevolviendo(item);
    setMotivoDevolucion(item.motivo_rechazo || '');
    setRevisando(null);
    setErrorRevision('');
  }

  async function confirmarDevolucion() {
    if (enviando || !devolviendo) return;
    setEnviando(true); setError(''); setErrorDevolucion(''); setMensaje('');
    try {
      const actualizada = await muralService.devolver(devolviendo.id_publicacion, motivoDevolucion);
      gestor.incorporar(actualizada);
      setDevolviendo(null);
      setMotivoDevolucion('');
      setMensaje('Publicación devuelta con observaciones.');
    } catch (err) {
      if (err.status === 409) {
        setDevolviendo(null);
        setError(err.message);
        gestor.cargar();
      } else {
        setErrorDevolucion(err.message);
      }
    }
    finally { setEnviando(false); }
  }

  async function cambiarDestacado(item) {
    if (enviando || item.status !== 'published') return;
    setEnviando(true); setError(''); setMensaje('');
    try {
      const actualizada = await muralService.editar(item.id_publicacion, { destacada: !item.destacada });
      gestor.incorporar(actualizada);
      setMensaje('Destacado actualizado. La publicación volvió a revisión.');
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  async function eliminar() {
    if (enviando || !pendiente) return;
    setEnviando(true); setError('');
    try { await muralService.eliminar(pendiente.id_publicacion); gestor.quitar(pendiente.id_publicacion); setPendiente(null); setMensaje('Publicación eliminada.'); }
    catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  function etiquetaEstado(situacion) {
    if (situacion === 'Publicada') return modoOscuro ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700';
    if (situacion === 'Pendiente de aprobación') return modoOscuro ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700';
    if (situacion === 'Devuelta para correcciones') return modoOscuro ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-50 text-rose-700';
    return modoOscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600';
  }

  if (esCoordinacion) {
    return (
      <section aria-labelledby="titulo-mural-coordinacion" className="max-w-3xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="titulo-mural-coordinacion" className={`text-xl font-black ${tema.title}`}>Mural</h2>
            <p className={`mt-1 text-sm ${tema.subtitle}`}>
              {pendientes.length === 1
                ? 'Tienes 1 publicación pendiente de revisión.'
                : `Tienes ${pendientes.length} publicaciones pendientes de revisión.`}
            </p>
          </div>
          <Link to="/calendario?vista=mural" className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${cardCls}`}>
            <Icono nombre="eye" className="h-4 w-4" />Ver mural publicado
          </Link>
        </header>

        {(error || gestor.error) && (
          <p role="alert" className="mb-4 text-sm text-red-500">
            {error || gestor.error}{' '}
            {gestor.error && <button type="button" onClick={gestor.cargar} className="underline cursor-pointer">Reintentar</button>}
          </p>
        )}
        {mensaje && <p role="status" className="mb-4 text-sm text-emerald-600">{mensaje}</p>}

        {gestor.cargando ? (
          <p className={`py-8 text-sm ${tema.subtitle}`}>Cargando publicaciones…</p>
        ) : pendientes.length === 0 ? (
          <div className={`rounded-2xl border px-6 py-12 text-center ${cardCls}`}>
            <Icono nombre="newspaper" className={`mx-auto mb-3 h-10 w-10 ${tema.subtitle}`} />
            <p className={`text-sm font-semibold ${tema.title}`}>No hay publicaciones por revisar</p>
            <p className={`mt-2 text-xs ${tema.subtitle}`}>Cuando el responsable del mural envíe una publicación, aparecerá aquí.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pendientes.map((item) => (
              <li key={item.id_publicacion} className={`flex items-center gap-4 rounded-2xl border p-4 ${cardCls}`}>
                <Miniatura url={item.url_imagen} titulo={item.titulo} />
                <div className="min-w-0 flex-1">
                  <h3 className={`truncate text-sm font-bold ${tema.title}`}>{item.titulo}</h3>
                  {item.subtitulo && <p className={`mt-0.5 truncate text-xs ${tema.subtitle}`}>{item.subtitulo}</p>}
                  <p className={`mt-1 text-[11px] ${tema.subtitle}`}>
                    Enviada el {formatearFechaLegible(item.enviado_revision_at || item.fecha_creacion)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setRevisando(item); setErrorRevision(''); }}
                  disabled={enviando}
                  className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 cursor-pointer disabled:opacity-40"
                >
                  Revisar
                </button>
              </li>
            ))}
          </ul>
        )}

        {revisando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 ${cardCls}`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className={`text-lg font-bold ${tema.title}`}>Revisar publicación</h3>
                <button type="button" onClick={() => { setRevisando(null); setErrorRevision(''); }} disabled={enviando} aria-label="Cerrar" className="p-2 cursor-pointer disabled:opacity-40"><Icono nombre="close" /></button>
              </div>
              {errorRevision && <p role="alert" className="mb-4 text-sm text-red-500">{errorRevision}</p>}
              <div className="space-y-4">
                {revisando.url_imagen && (
                  <img src={revisando.url_imagen} alt={revisando.titulo} className="w-full max-h-64 rounded-xl object-contain" />
                )}
                <div>
                  <p className={`text-xs font-bold uppercase ${tema.subtitle}`}>Título</p>
                  <p className={`text-base font-semibold ${tema.title}`}>{revisando.titulo}</p>
                </div>
                {revisando.subtitulo && (
                  <div>
                    <p className={`text-xs font-bold uppercase ${tema.subtitle}`}>Resumen</p>
                    <p className={`text-sm ${tema.title}`}>{revisando.subtitulo}</p>
                  </div>
                )}
                <div>
                  <p className={`text-xs font-bold uppercase ${tema.subtitle}`}>Contenido</p>
                  <p className={`whitespace-pre-wrap text-sm leading-relaxed ${tema.title}`}>{revisando.contenido}</p>
                </div>
                {revisando.enlace_url && (
                  <div>
                    <p className={`text-xs font-bold uppercase ${tema.subtitle}`}>Enlace</p>
                    <a href={revisando.enlace_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-500 underline">
                      {revisando.enlace_texto || revisando.enlace_url}
                    </a>
                  </div>
                )}
                {revisando.fecha_retiro && (
                  <p className={`text-xs ${tema.subtitle}`}>Último día visible: {revisando.fecha_retiro}</p>
                )}
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => iniciarDevolucion(revisando)}
                  disabled={enviando}
                  className="rounded-lg border px-4 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Devolver con observaciones
                </button>
                <button
                  type="button"
                  onClick={() => aprobar(revisando)}
                  disabled={enviando}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white cursor-pointer disabled:opacity-40"
                >
                  <Icono nombre="check" className="h-3.5 w-3.5" />Aprobar y publicar
                </button>
              </div>
            </div>
          </div>
        )}

        {devolviendo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className={`w-full max-w-md rounded-2xl border p-6 ${cardCls}`}>
              <h3 className={`text-lg font-bold ${tema.title}`}>Devolver con observaciones</h3>
              <p className={`mt-1 text-sm ${tema.subtitle}`}>Escribe qué debe corregir el responsable del mural antes de aprobar la publicación.</p>
              {errorDevolucion && <p role="alert" className="mt-3 text-sm text-red-500">{errorDevolucion}</p>}
              <textarea
                value={motivoDevolucion}
                onChange={(e) => setMotivoDevolucion(e.target.value)}
                maxLength={2000}
                rows={4}
                className={`${inputCls} mt-3 w-full`}
                placeholder="Ej. Aclara la fecha, corrige la imagen..."
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setDevolviendo(null); setMotivoDevolucion(''); setErrorDevolucion(''); }} disabled={enviando} className={`px-3 py-2 text-xs font-semibold cursor-pointer ${tema.btnInactive}`}>Cancelar</button>
                <button type="button" onClick={confirmarDevolucion} disabled={enviando || !motivoDevolucion.trim()} className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-40">Devolver</button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-gestion-mural" className="max-w-6xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="titulo-gestion-mural" className={`text-xl font-black ${tema.title}`}>Mural digital</h2>
          <p className={`mt-1 text-sm ${tema.subtitle}`}>
            {esResponsableMural
              ? 'Crea y edita publicaciones; envíalas a aprobación para que Coordinación las publique.'
              : 'Consulta de publicaciones pendientes de aprobación.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/calendario?vista=mural" className={`rounded-lg border px-3 py-2 text-xs font-semibold ${cardCls}`}>Ver mural</Link>
          {esResponsableMural && (
            <button type="button" onClick={() => setEditor({})} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 cursor-pointer">
              <Icono nombre="plus" className="h-4 w-4" />Nueva publicación
            </button>
          )}
        </div>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-3">
            <input aria-label="Buscar publicación del mural" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar título o mensaje…" className={`${inputCls} flex-1 min-w-40`} />
            <select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}>
              {ESTADOS_MURAL.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          {(error || gestor.error) && <p role="alert" className="text-sm text-red-500">{error || gestor.error} {gestor.error && <button type="button" onClick={gestor.cargar} className="underline cursor-pointer">Reintentar</button>}</p>}
          {mensaje && <p role="status" className="text-sm text-emerald-600">{mensaje}</p>}
          {gestor.cargando ? <p className={`py-8 text-sm ${tema.subtitle}`}>Cargando publicaciones…</p> : !lista.length ? (
            <div className={`rounded-2xl border px-6 py-10 text-center ${cardCls}`}>
              <Icono nombre="newspaper" className={`mx-auto mb-3 h-8 w-8 ${tema.subtitle}`} />
              <p className={`text-sm font-semibold ${tema.title}`}>{busqueda || estado !== 'todos' ? 'No hay publicaciones con esos filtros.' : esResponsableMural ? 'Tu primera publicación empieza aquí.' : 'No hay publicaciones pendientes de revisión.'}</p>
              <p className={`mt-2 text-xs ${tema.subtitle}`}>{esResponsableMural ? 'Agrega un cartel, un mensaje o un enlace para la comunidad.' : 'Cuando el responsable envíe una publicación, aparecerá aquí.'}</p>
            </div>
          ) : lista.map((item) => {
            const situacion = estadoPublicacionMural(item, hoy);
            const puedeEditar = esResponsableMural && ['draft', 'rejected', 'published'].includes(item.status);
            const puedeEliminar = esResponsableMural && ['draft', 'rejected'].includes(item.status) && item.id_autor === usuario?.id;
            const puedeEnviar = esResponsableMural && ['draft', 'rejected'].includes(item.status);
            return <article key={item.id_publicacion} className={`rounded-2xl border p-4 ${cardCls}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${etiquetaEstado(situacion)}`}>{situacion}</span>
                {item.destacada && <span className="text-[10px] font-semibold text-amber-600">Destacada</span>}
                {item.fecha_retiro && <span className={`text-[10px] ${tema.subtitle}`}>Último día visible: {item.fecha_retiro}</span>}
              </div>
              <h3 className={`break-words text-sm font-bold ${tema.title}`}>{item.titulo}</h3>
              <p className={`mt-1 line-clamp-2 break-words text-xs leading-relaxed ${tema.subtitle}`}>{item.subtitulo || item.contenido}</p>
              {item.motivo_rechazo && (
                <div className={`mt-2 rounded-lg border p-2 text-xs ${modoOscuro ? 'border-rose-900/50 bg-rose-950/20 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                  <span className="font-semibold">Observaciones:</span> {item.motivo_rechazo}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {puedeEditar && <button type="button" onClick={() => setEditor(item)} disabled={enviando} className={`rounded-lg border px-3 py-2 text-xs font-bold cursor-pointer ${cardCls}`}>Editar</button>}
                <button type="button" onClick={() => setDetalle(item)} className={`px-2 py-2 text-xs font-semibold cursor-pointer ${tema.btnInactive}`}>Vista previa</button>
                {esResponsableMural && item.status === 'published' && (
                  <button type="button" disabled={enviando} onClick={() => cambiarDestacado(item)} className={`px-2 py-2 text-xs font-semibold cursor-pointer ${tema.btnInactive}`}>{item.destacada ? 'Quitar destacado' : 'Destacar'}</button>
                )}
                {puedeEnviar && (
                  <button type="button" disabled={enviando} onClick={() => enviarAprobacion(item)} className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 cursor-pointer">
                    <Icono nombre="send" className="h-3.5 w-3.5" />Enviar a aprobación
                  </button>
                )}
                {puedeEliminar && (
                  <button type="button" disabled={enviando} onClick={() => setPendiente(item)} aria-label={`Eliminar ${item.titulo}`} className="ml-auto p-2 text-slate-400 hover:text-red-500 cursor-pointer">
                    <Icono nombre="trash" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </article>;
          })}
          <div className={`rounded-xl border p-4 ${cardCls}`}>
            <h3 className={`text-xs font-bold ${tema.title}`}>También aparecen en el mural</h3>
            <p className={`mt-1 text-xs leading-relaxed ${tema.subtitle}`}>
              {esResponsableMural
                ? 'Las noticias y eventos que marques con «Mostrar también en el mural» pasan por el flujo de aprobación de rectoría. Las fechas académicas las administra Coordinación y Rectoría.'
                : 'Las noticias, eventos y fechas que marques con «Mostrar también en el mural». Puedes editar su información desde cada sección.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <Link className="text-xs font-semibold text-blue-500 underline" to={`${basePanel}?seccion=noticias`}>Noticias y eventos</Link>
              {!esResponsableMural && <Link className="text-xs font-semibold text-blue-500 underline" to={`${basePanel}?seccion=calendario`}>Fechas académicas</Link>}
            </div>
          </div>
        </div>
        <aside className={`min-w-0 rounded-2xl border p-4 ${cardCls}`}><QrMural editable /></aside>
      </div>
      {editor && <EditorPublicacionMural publicacion={editor} onClose={() => setEditor(null)} onGuardado={guardada} />}
      {detalle && <ModalDetalleCalendario publicacion={detalle} onClose={() => setDetalle(null)} />}
      <ModalConfirmacion
        show={!!pendiente}
        titulo="Eliminar publicación del mural"
        mensaje={`¿Eliminar «${pendiente?.titulo || ''}»? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        varianteDanger
        cargando={enviando}
        onConfirmar={eliminar}
        onCancelar={() => { if (!enviando) setPendiente(null); }}
      />
    </section>
  );
}
