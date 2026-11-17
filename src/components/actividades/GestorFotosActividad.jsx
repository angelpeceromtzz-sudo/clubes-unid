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
      <h3 className={'text-xl font-bold ' + tema.title}>Comparte un momento</h3>
      <label className={labelCls}>Descripción de las fotografías<textarea className={inputCls} value={pie} maxLength={300} rows={3} placeholder="Cuéntale a la comunidad qué están compartiendo…" onChange={(evento) => setPie(evento.target.value)} /></label>
      <label className={labelCls}>Seleccionar fotografías<input ref={archivosRef} aria-label="Seleccionar fotografías" className={inputCls} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={agregarArchivos} /></label>
      <p className={'text-sm ' + tema.subtitle}>Hasta 10 fotografías por publicación; máximo 5 MB cada una.</p>
      {seleccionadas.length > 0 && <><p className="text-sm font-semibold" role="status">{seleccionadas.length} {seleccionadas.length === 1 ? 'fotografía seleccionada' : 'fotografías seleccionadas'}</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {seleccionadas.map((foto) => <figure key={foto.id} className="relative"><img src={foto.url} alt={'Vista previa de ' + foto.archivo.name} className="aspect-square w-full rounded-xl object-cover" /><button type="button" aria-label={'Quitar ' + foto.archivo.name} className="absolute top-2 right-2 rounded-full bg-slate-950/80 p-2 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => quitar(foto.id)}><Icono nombre="close" className="h-4 w-4" /></button></figure>)}
      </div></>}
      <BotonAccion type="submit" disabled={!seleccionadas.length}>{pendiente ? 'Subiendo fotografías…' : puedeAprobar ? 'Publicar fotografías' : 'Enviar fotografías a revisión'}</BotonAccion>
    </fieldset></form>
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    <fieldset disabled={pendiente}><GaleriaFotosActividad fotos={fotos} titulo={edicion.nombre} mostrarEstado acciones={(foto) => <>
      {puedeAprobar && foto.estado !== 'publicada' && <BotonAccion size="sm" onClick={() => revisar(foto, 'publicada')}>Publicar foto</BotonAccion>}
      {puedeAprobar && foto.estado === 'pendiente' && <BotonAccion size="sm" variant="outline" onClick={() => revisar(foto, 'rechazada')}>Rechazar foto</BotonAccion>}
      <BotonAccion size="sm" variant="outline" onClick={() => revisar(foto, 'eliminada')}>Retirar foto</BotonAccion>
    </>} /></fieldset>
  </section>;
}
