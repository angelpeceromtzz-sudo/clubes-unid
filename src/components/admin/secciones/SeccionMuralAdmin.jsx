import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAutenticacion } from '../../../contexts/AuthContext';
import { useMural } from '../../../hooks/useMural';
import { muralService } from '../../../services/mural.service';
import { fechaHoyCampus } from '../../../utils/fechas';
import { estadoPublicacionMural } from '../../../utils/mural';
import { Icono } from '../../ui/Icono';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { EditorPublicacionMural } from '../../calendario/EditorPublicacionMural';
import { ModalDetalleCalendario } from '../../calendario/ModalDetalleCalendario';
import { QrMural } from '../../calendario/QrMural';

export function SeccionMuralAdmin() {
  const { tema, cardCls, inputCls, selectCls, modoOscuro } = useTheme();
  const { esAdmin, esResponsableMural } = useAutenticacion();
  const gestor = useMural(true);
  const [editor, setEditor] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const hoy = fechaHoyCampus();
  const basePanel = `${esAdmin ? '/admin' : esResponsableMural ? '/mural' : '/rectoria'}/dashboard`;
  const lista = useMemo(() => gestor.publicaciones.filter((item) =>
    `${item.titulo} ${item.subtitulo || ''} ${item.contenido}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')) &&
    (estado === 'todos' || estadoPublicacionMural(item, hoy) === estado)), [gestor.publicaciones, busqueda, estado, hoy]);
  function guardada(item) { gestor.incorporar(item); setMensaje(item.publicada ? 'Publicación guardada. Ya puedes verla en el mural.' : 'Borrador guardado. Solo los editores pueden verlo.'); }
  async function cambiar(item, datos) {
    if (enviando) return;
    if (datos.publicada && item.fecha_retiro && item.fecha_retiro < hoy) { setEditor(item); setError('Actualiza el último día visible antes de volver a publicar.'); return; }
    setEnviando(true); setError(''); setMensaje('');
    try { const actualizada = await muralService.editar(item.id_publicacion, datos); gestor.incorporar(actualizada); setMensaje('Publicación actualizada.'); }
    catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }
  async function eliminar() {
    if (enviando || !pendiente) return;
    setEnviando(true); setError('');
    try { await muralService.eliminar(pendiente.id_publicacion); gestor.quitar(pendiente.id_publicacion); setPendiente(null); setMensaje('Publicación eliminada.'); }
    catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }
  return (
    <section aria-labelledby="titulo-gestion-mural" className="max-w-6xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h2 id="titulo-gestion-mural" className={`text-xl font-black ${tema.title}`}>Mural digital</h2><p className={`mt-1 text-sm ${tema.subtitle}`}>Publicaciones propias, carteles y mensajes para el campus.</p></div><div className="flex flex-wrap gap-2"><Link to="/calendario?vista=mural" className={`rounded-lg border px-3 py-2 text-xs font-semibold ${cardCls}`}>Ver mural</Link><button type="button" onClick={() => setEditor({})} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 cursor-pointer"><Icono nombre="plus" className="h-4 w-4" />Nueva publicación</button></div></header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-3"><input aria-label="Buscar publicación del mural" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar título o mensaje…" className={`${inputCls} flex-1 min-w-40`} /><select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}><option value="todos">Todos los estados</option>{['Publicada', 'Borrador', 'Retirada'].map((item) => <option key={item}>{item}</option>)}</select></div>
          {(error || gestor.error) && <p role="alert" className="text-sm text-red-500">{error || gestor.error} {gestor.error && <button type="button" onClick={gestor.cargar} className="underline cursor-pointer">Reintentar</button>}</p>}
          {mensaje && <p role="status" className="text-sm text-emerald-600">{mensaje}</p>}
          {gestor.cargando ? <p className={`py-8 text-sm ${tema.subtitle}`}>Cargando publicaciones…</p> : !lista.length ? <div className={`rounded-2xl border px-6 py-10 text-center ${cardCls}`}><Icono nombre="newspaper" className={`mx-auto mb-3 h-8 w-8 ${tema.subtitle}`} /><p className={`text-sm font-semibold ${tema.title}`}>{busqueda || estado !== 'todos' ? 'No hay publicaciones con esos filtros.' : 'Tu primera publicación empieza aquí.'}</p><p className={`mt-2 text-xs ${tema.subtitle}`}>Agrega un cartel, un mensaje o un enlace para la comunidad.</p></div> : lista.map((item) => {
            const situacion = estadoPublicacionMural(item, hoy);
            return <article key={item.id_publicacion} className={`rounded-2xl border p-4 ${cardCls}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${situacion === 'Publicada' ? modoOscuro ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700' : modoOscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{situacion}</span>{item.destacada && <span className="text-[10px] font-semibold text-amber-600">Destacada</span>}{item.fecha_retiro && <span className={`text-[10px] ${tema.subtitle}`}>Último día visible: {item.fecha_retiro}</span>}</div>
              <h3 className={`break-words text-sm font-bold ${tema.title}`}>{item.titulo}</h3><p className={`mt-1 line-clamp-2 break-words text-xs leading-relaxed ${tema.subtitle}`}>{item.subtitulo || item.contenido}</p>
              <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setEditor(item)} disabled={enviando} className={`rounded-lg border px-3 py-2 text-xs font-bold cursor-pointer ${cardCls}`}>Editar</button><button type="button" onClick={() => setDetalle(item)} className={`px-2 py-2 text-xs font-semibold cursor-pointer ${tema.btnInactive}`}>Vista previa</button><button type="button" disabled={enviando} onClick={() => cambiar(item, { destacada: !item.destacada })} className={`px-2 py-2 text-xs font-semibold cursor-pointer ${tema.btnInactive}`}>{item.destacada ? 'Quitar destacado' : 'Destacar'}</button><button type="button" disabled={enviando} onClick={() => situacion === 'Retirada' ? setEditor(item) : cambiar(item, { publicada: !item.publicada })} className={`px-2 py-2 text-xs font-semibold cursor-pointer ${tema.btnInactive}`}>{situacion === 'Publicada' ? 'Ocultar' : situacion === 'Retirada' ? 'Renovar vigencia' : 'Publicar'}</button><button type="button" disabled={enviando} onClick={() => setPendiente(item)} aria-label={`Eliminar ${item.titulo}`} className="ml-auto p-2 text-slate-400 hover:text-red-500 cursor-pointer"><Icono nombre="trash" className="h-4 w-4" /></button></div>
            </article>;
          })}
          <div className={`rounded-xl border p-4 ${cardCls}`}><h3 className={`text-xs font-bold ${tema.title}`}>También aparecen en el mural</h3><p className={`mt-1 text-xs leading-relaxed ${tema.subtitle}`}>{esResponsableMural ? 'Las noticias y eventos que marques con «Mostrar también en el mural» aparecen cuando rectoría los aprueba. Las fechas académicas las administra Coordinación y Rectoría.' : 'Las noticias, eventos y fechas que marques con «Mostrar también en el mural». Puedes editar su información desde cada sección.'}</p><div className="mt-3 flex flex-wrap gap-4"><Link className="text-xs font-semibold text-blue-500 underline" to={`${basePanel}?seccion=noticias`}>Noticias y eventos</Link>{!esResponsableMural && <Link className="text-xs font-semibold text-blue-500 underline" to={`${basePanel}?seccion=calendario`}>Fechas académicas</Link>}</div></div>
        </div>
        <aside className={`min-w-0 rounded-2xl border p-4 ${cardCls}`}><QrMural editable /></aside>
      </div>
      {editor && <EditorPublicacionMural publicacion={editor} onClose={() => setEditor(null)} onGuardado={guardada} />}
      {detalle && <ModalDetalleCalendario publicacion={detalle} onClose={() => setDetalle(null)} />}
      <ModalConfirmacion show={!!pendiente} titulo="Eliminar publicación del mural" mensaje={`¿Eliminar «${pendiente?.titulo || ''}»? Esta acción no se puede deshacer.`} textoConfirmar="Eliminar" varianteDanger cargando={enviando} onConfirmar={eliminar} onCancelar={() => { if (!enviando) setPendiente(null); }} />
    </section>
  );
}
