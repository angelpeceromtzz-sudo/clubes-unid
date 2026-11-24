import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { actividadService } from '../../services/actividad.service';
import { GaleriaFotosActividad } from './GaleriaFotosActividad';
import { BotonAccion } from '../ui/BotonAccion';
import { Icono } from '../ui/Icono';

const FORMATOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function GestorFotosActividad({ edicion, fotos, puedeAprobar, onActualizar }) {
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

  async function publicar(evento) {
    evento.preventDefault();
    if (pendiente || !seleccionadas.length) return;
    setPendiente(true); setError('');
    try {
      const subir = edicion.id_edicion ? actividadService.subirFotos : actividadService.subirFotosClub;
      const resultado = await subir(edicion.id_edicion || edicion.id_club, seleccionadas.map((foto) => foto.archivo), pie);
      for (const url of urlsRef.current.values()) URL.revokeObjectURL(url);
      urlsRef.current.clear(); setSeleccionadas([]); setPie('');
      onActualizar(resultado.every((foto) => foto.estado === 'publicada') ? 'Las fotografías ya están publicadas.' : 'Las fotografías se enviaron a revisión.');
    } catch (fallo) { setError(fallo.mensajeServidor || fallo.message); } finally { setPendiente(false); }
  }

  async function revisar(foto, estado) {
    if (pendiente) return;
    setPendiente(true); setError('');
    try {
      await actividadService.revisarFoto(foto.id_foto, estado);
      onActualizar(estado === 'publicada' ? 'Fotografía publicada.' : estado === 'eliminada' ? 'Fotografía retirada.' : 'Fotografía devuelta.');
    } catch (fallo) { setError(fallo.mensajeServidor || fallo.message); } finally { setPendiente(false); }
  }

  return <section className="space-y-6" aria-label="Administrar fotografías">
    <form aria-label="Compartir fotografías" onSubmit={publicar} className={'space-y-4 rounded-2xl border p-4 sm:p-5 ' + cardCls}><fieldset disabled={pendiente} className="space-y-4">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-amber-400/15 p-2.5 text-amber-500"><Icono nombre="image" className="h-6 w-6" /></span><div><h3 className={'text-xl font-bold ' + tema.title}>Comparte un momento</h3><p className={'mt-1 text-sm ' + tema.subtitle}>Comparte fotografías de la actividad.</p></div></div>
      <label className={labelCls + ' gap-1.5'}>Cuéntale algo a la comunidad<textarea className={inputCls + ' min-h-24 resize-y'} value={pie} maxLength={300} rows={3} placeholder="¿Qué están compartiendo?" onChange={(evento) => setPie(evento.target.value)} /></label>
      <p className={'text-xs ' + tema.subtitle}>JPG, PNG, GIF o WebP · máximo 5 MB por imagen</p>
      {seleccionadas.length === 0 && <button type="button" className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-400/15 via-amber-400/5 to-transparent px-4 py-4 text-left transition hover:border-amber-400 hover:shadow-lg hover:shadow-amber-400/10 cursor-pointer" onClick={() => archivosRef.current?.click()}><span className="absolute -right-5 -top-8 h-20 w-20 rounded-full bg-amber-400/15 blur-2xl transition group-hover:bg-amber-400/25" /><span className="relative rounded-lg bg-amber-400 p-2.5 text-slate-950 shadow-md"><Icono nombre="image" className="h-6 w-6" /></span><span className="relative"><strong className="block">Agrega una imagen</strong><span className={'text-sm ' + tema.subtitle}>Hasta 10 fotografías</span></span></button>}
      <input ref={archivosRef} aria-label="Seleccionar fotografías" className="sr-only" type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={agregarArchivos} />
      {seleccionadas.length > 0 && <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 cursor-pointer" onClick={() => archivosRef.current?.click()}><Icono nombre="plus" className="h-4 w-4" />Agregar más fotografías</button>}
      {seleccionadas.length > 0 && <><p className="text-sm font-semibold" role="status">{seleccionadas.length} de 10 fotografías seleccionadas</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {seleccionadas.map((foto) => <figure key={foto.id} className="relative"><img src={foto.url} alt={'Vista previa de ' + foto.archivo.name} className="aspect-square w-full rounded-xl object-cover" /><button type="button" aria-label={'Quitar ' + foto.archivo.name} className="absolute top-2 right-2 rounded-full bg-slate-950/80 p-2 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => quitar(foto.id)}><Icono nombre="close" className="h-4 w-4" /></button></figure>)}
      </div></>}
      <p className={'text-xs ' + tema.subtitle}>Tu publicación será revisada antes de aparecer en la galería.</p><BotonAccion type="submit" disabled={!seleccionadas.length}>{pendiente ? 'Subiendo fotografías…' : puedeAprobar ? 'Compartir fotografías' : 'Enviar fotografías a revisión'}</BotonAccion>
    </fieldset></form>
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    <fieldset disabled={pendiente}><GaleriaFotosActividad fotos={fotos} titulo={edicion.nombre} mostrarEstado acciones={(foto) => <>
      {puedeAprobar && foto.estado !== 'publicada' && <BotonAccion size="sm" onClick={() => revisar(foto, 'publicada')}>Publicar foto</BotonAccion>}
      {puedeAprobar && foto.estado === 'pendiente' && <BotonAccion size="sm" variant="outline" onClick={() => revisar(foto, 'rechazada')}>Rechazar foto</BotonAccion>}
      <BotonAccion size="sm" variant="outline" onClick={() => revisar(foto, 'eliminada')}>Retirar foto</BotonAccion>
    </>} /></fieldset>
  </section>;
}
