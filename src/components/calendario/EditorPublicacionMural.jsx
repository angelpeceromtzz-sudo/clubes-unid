import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../services/api';
import { muralService } from '../../services/mural.service';
import { fechaHoyCampus } from '../../utils/fechas';
import { useDialogoCalendario } from '../../hooks/useDialogoCalendario';
import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { TarjetaMural } from './TarjetaMural';
import { ModalDetalleCalendario } from './ModalDetalleCalendario';

const VACIO = { titulo: '', subtitulo: '', contenido: '', url_imagen: '', enlace_url: '', enlace_texto: '', publicada: false, destacada: false, fecha_retiro: '' };

export function EditorPublicacionMural({ publicacion, onClose, onGuardado }) {
  const { tema, modoOscuro, inputCls, cardCls } = useTheme();
  const [form, setForm] = useState(() => ({ ...VACIO, ...publicacion }));
  const [enviando, setEnviando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState(false);
  const bloqueado = enviando || subiendo;
  const ref = useDialogoCalendario(onClose, bloqueado || detalle);
  const label = `block text-xs font-semibold ${tema.title}`;
  const previa = { ...form, origen: 'mural', titulo: form.titulo || 'Título de tu publicación', contenido: form.contenido || 'El mensaje para la comunidad aparecerá aquí.' };

  function cambiar(e) {
    const { name, value, type, checked } = e.target;
    setForm((actual) => ({ ...actual, [name]: type === 'checkbox' ? checked : value }));
  }
  async function subir(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) { setError('Elige una imagen JPG, PNG, WebP o GIF de hasta 5 MB.'); return; }
    setSubiendo(true); setError('');
    try { const resultado = await api.uploadImagen(archivo); setForm((actual) => ({ ...actual, url_imagen: resultado.url })); }
    catch (err) { setError(err.message); }
    finally { setSubiendo(false); }
  }
  async function guardar(e) {
    e.preventDefault();
    if (bloqueado) return;
    setError('');
    if (form.publicada && form.fecha_retiro && form.fecha_retiro < fechaHoyCampus()) { setError('Elige hoy o una fecha futura para retirar la publicación, o guárdala como borrador.'); return; }
    setEnviando(true);
    const datos = Object.fromEntries(Object.keys(VACIO).map((campo) => [campo, typeof form[campo] === 'string' ? form[campo].trim() || null : form[campo]]));
    try {
      const resultado = publicacion?.id_publicacion ? await muralService.editar(publicacion.id_publicacion, datos) : await muralService.crear(datos);
      onGuardado(resultado); onClose();
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }
  return <>
    <ModalBase show onClose={onClose} closeOnBackdrop={!bloqueado && !detalle} maxWidth="max-w-4xl" panelClassName={`border ${cardCls}`}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="titulo-editor-mural" inert={detalle || undefined}>
        <div className="mb-5 flex items-start justify-between gap-3"><div><h2 id="titulo-editor-mural" className={`text-lg font-bold ${tema.title}`}>{publicacion?.id_publicacion ? 'Editar publicación' : 'Nueva publicación del mural'}</h2><p className={`mt-1 text-xs ${tema.subtitle}`}>Comparte un cartel, una convocatoria o un mensaje con el campus.</p></div><button type="button" onClick={onClose} disabled={bloqueado} aria-label="Cerrar editor" className="p-2 cursor-pointer disabled:opacity-40"><Icono nombre="close" /></button></div>
        <form onSubmit={guardar}>
          <fieldset disabled={bloqueado} className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <label className={label}>Título<input name="titulo" value={form.titulo} onChange={cambiar} maxLength={200} required className={`${inputCls} mt-1.5`} placeholder="¿Qué quieres compartir?" /></label>
              <label className={label}>Resumen (opcional)<input name="subtitulo" value={form.subtitulo || ''} onChange={cambiar} maxLength={300} className={`${inputCls} mt-1.5`} placeholder="Una frase para presentar el aviso" /></label>
              <label className={label}>Mensaje<textarea name="contenido" value={form.contenido} onChange={cambiar} maxLength={20000} rows={5} required className={`${inputCls} mt-1.5 resize-y`} placeholder="Incluye la información que necesita la comunidad." /></label>
              <div><label className={label}>Imagen o cartel<input type="file" onChange={subir} accept="image/jpeg,image/png,image/webp,image/gif" className={`${inputCls} mt-1.5 text-xs file:mr-3 file:rounded file:border-0 file:px-2 file:py-1`} /></label><p className={`mt-1 text-[11px] ${tema.subtitle}`}>JPG, PNG, WebP o GIF · hasta 5 MB.</p>{subiendo && <p role="status" className={`mt-2 text-xs ${tema.subtitle}`}>Subiendo imagen…</p>}{form.url_imagen && <button type="button" onClick={() => setForm((actual) => ({ ...actual, url_imagen: '' }))} className="mt-2 text-xs font-semibold text-red-500 cursor-pointer">Quitar imagen</button>}</div>
              <details><summary className={`text-xs font-semibold cursor-pointer ${tema.title}`}>Agregar un enlace (opcional)</summary><div className="mt-3 space-y-3"><label className={label}>Dirección<input type="url" name="enlace_url" value={form.enlace_url || ''} onChange={cambiar} maxLength={2048} placeholder="https://…" className={`${inputCls} mt-1.5`} /></label><label className={label}>Texto del botón<input name="enlace_texto" value={form.enlace_texto || ''} onChange={cambiar} maxLength={80} placeholder="Ej. Ver convocatoria" className={`${inputCls} mt-1.5`} /></label></div></details>
            </div>
            <div className="min-w-0 space-y-4">
              <div><p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${tema.subtitle}`}>Vista previa de la tarjeta</p><TarjetaMural item={previa} onDetalle={() => setDetalle(true)} /></div>
              <div className={`space-y-4 rounded-xl border p-4 ${modoOscuro ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
                <label className={label}>Visibilidad<select value={String(form.publicada)} onChange={(e) => setForm((actual) => ({ ...actual, publicada: e.target.value === 'true' }))} className={`${inputCls} mt-1.5`}><option value="false">Borrador · solo editores</option><option value="true">Publicada · visible para todos</option></select></label>
                <label className={`flex items-start gap-2 text-xs ${tema.title}`}><input type="checkbox" name="destacada" checked={form.destacada} onChange={cambiar} className="mt-0.5 accent-amber-400" /><span><span className="font-semibold">Destacar en el mural</span><span className={`mt-0.5 block text-[11px] ${tema.subtitle}`}>Se mostrará antes que las publicaciones normales.</span></span></label>
                <label className={label}>Último día visible (opcional)<input type="date" name="fecha_retiro" value={form.fecha_retiro || ''} onChange={cambiar} className={`${inputCls} mt-1.5`} /><span className={`mt-1 block text-[11px] font-normal ${tema.subtitle}`}>Al terminar ese día, se retira automáticamente. Se conserva para editarla.</span></label>
              </div>
            </div>
          </fieldset>
          {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} disabled={bloqueado} className={`px-3 py-2 text-xs font-semibold cursor-pointer disabled:opacity-40 ${tema.btnInactive}`}>Cancelar</button><button type="submit" disabled={bloqueado} className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 cursor-pointer hover:bg-amber-300 disabled:opacity-40">{enviando ? 'Guardando…' : form.publicada ? publicacion?.id_publicacion ? 'Guardar y publicar' : 'Publicar en el mural' : 'Guardar borrador'}</button></div>
        </form>
      </div>
    </ModalBase>
    {detalle && <ModalDetalleCalendario publicacion={previa} onClose={() => setDetalle(false)} />}
  </>;
}
