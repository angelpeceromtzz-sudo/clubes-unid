import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { actividadService } from '../../services/actividad.service';
import { GaleriaFotosActividad } from './GaleriaFotosActividad';
import { BotonAccion } from '../ui/BotonAccion';
import { Icono } from '../ui/Icono';

const FORMATOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function FotosParticipante({ idEdicion, fotos, onActualizar, acceso }) {
  const { tema, inputCls, labelCls, cardCls } = useTheme();
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [pie, setPie] = useState('');
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState(false);
  const urlsRef = useRef(new Map());
  const archivosRef = useRef(null);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => { for (const url of urls.values()) URL.revokeObjectURL(url); urls.clear(); };
  }, []);

  function agregarArchivos(evento) {
    const archivos = Array.from(evento.target.files || []);
    evento.target.value = '';
    setError('');
    if (archivos.some((archivo) => !FORMATOS.includes(archivo.type))) { setError('Selecciona imágenes JPG, PNG, GIF o WebP.'); return; }
    if (archivos.some((archivo) => archivo.size > 5 * 1024 * 1024)) { setError('Cada imagen puede pesar hasta 5 MB.'); return; }
    const nuevas = [];
    for (const archivo of archivos) {
      const id = archivo.name + ':' + archivo.size + ':' + archivo.lastModified;
      if (!seleccionadas.some((foto) => foto.id === id) && !nuevas.some((foto) => foto.id === id)) nuevas.push({ id, archivo });
    }
    if (seleccionadas.length + nuevas.length > 10) { setError('Puedes seleccionar hasta 10 fotografías por publicación.'); return; }
    for (const nueva of nuevas) { nueva.url = URL.createObjectURL(nueva.archivo); urlsRef.current.set(nueva.id, nueva.url); }
    setSeleccionadas((actual) => [...actual, ...nuevas]);
  }

  function quitar(id) {
    const url = urlsRef.current.get(id);
    if (url) URL.revokeObjectURL(url);
    urlsRef.current.delete(id);
    setSeleccionadas((actual) => actual.filter((foto) => foto.id !== id));
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (pendiente || !seleccionadas.length) return;
    setPendiente(true); setError('');
    try {
      await actividadService.subirFotosParticipante(idEdicion, seleccionadas.map((foto) => foto.archivo), pie, acceso);
      for (const url of urlsRef.current.values()) URL.revokeObjectURL(url);
      urlsRef.current.clear(); setSeleccionadas([]); setPie('');
      onActualizar('Tus fotografías se enviaron a revisión.');
    } catch (fallo) { setError(fallo.mensajeServidor || fallo.message); } finally { setPendiente(false); }
  }

  return <section className="space-y-6" aria-label="Compartir fotografías">
    <form aria-label="Compartir fotografías" onSubmit={enviar} className={'space-y-4 rounded-2xl border p-4 sm:p-5 ' + cardCls}><fieldset disabled={pendiente} className="space-y-4">
      <div><h3 className={'text-xl font-bold ' + tema.title}>Comparte un momento</h3><p className={'mt-1 text-sm ' + tema.subtitle}>Comparte fotografías de tu participación; serán revisadas antes de publicarse.</p></div>
      {seleccionadas.length === 0 && <button type="button" className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/5 px-4 py-4 text-left transition hover:border-amber-400 hover:bg-amber-400/10 cursor-pointer" onClick={() => archivosRef.current?.click()}><Icono nombre="image" className="h-7 w-7 shrink-0 text-amber-500" /><span><strong className="block">Agrega una imagen</strong><span className={'text-sm ' + tema.subtitle}>Elige hasta 10 fotografías para compartir</span></span></button>}
      <input ref={archivosRef} aria-label="Seleccionar fotografías" className="sr-only" type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={agregarArchivos} />
      {seleccionadas.length > 0 && <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 cursor-pointer" onClick={() => archivosRef.current?.click()}><Icono nombre="plus" className="h-4 w-4" />Agregar más fotografías</button>}
      <label className={labelCls}>Cuéntale algo a la comunidad<textarea className={inputCls} value={pie} maxLength={300} rows={3} placeholder="¿Qué están compartiendo?" onChange={(evento) => setPie(evento.target.value)} /></label>
      <p className={'text-xs ' + tema.subtitle}>JPG, PNG, GIF o WebP · máximo 5 MB por imagen</p>
      {seleccionadas.length > 0 && <><p className="text-sm font-semibold" role="status">{seleccionadas.length} {seleccionadas.length === 1 ? 'fotografía seleccionada' : 'fotografías seleccionadas'}</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {seleccionadas.map((foto) => <figure key={foto.id} className="relative"><img src={foto.url} alt={'Vista previa de ' + foto.archivo.name} className="aspect-square w-full rounded-xl object-cover" /><button type="button" aria-label={'Quitar ' + foto.archivo.name} className="absolute top-2 right-2 rounded-full bg-slate-950/80 p-2 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => quitar(foto.id)}><Icono nombre="close" className="h-4 w-4" /></button></figure>)}
      </div></>}
      <BotonAccion type="submit" disabled={!seleccionadas.length}>{pendiente ? 'Subiendo fotografías…' : 'Enviar fotografías a revisión'}</BotonAccion>
    </fieldset></form>
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    {fotos?.length > 0 && <fieldset className="space-y-4"><GaleriaFotosActividad fotos={fotos} titulo="Fotografías de la edición" mostrarEstado={true} /></fieldset>}
  </section>;
}
