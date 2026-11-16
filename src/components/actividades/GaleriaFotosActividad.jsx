import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBloqueoScroll } from '../../hooks/useBloqueoScroll';
import { Icono } from '../ui/Icono';
import { EstadoActividad } from './ActividadUI';

export function GaleriaFotosActividad({ fotos = [], titulo, mostrarEstado = false, acciones }) {
  const { tema, cardCls, modoOscuro } = useTheme();
  const [seleccion, setSeleccion] = useState(null);
  const dialogoRef = useRef(null);
  const gestoRef = useRef(null);
  const indice = fotos.findIndex((foto) => foto.id_foto === seleccion);
  const fotoActual = fotos[indice];
  const abierta = Boolean(fotoActual);
  useBloqueoScroll(abierta);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!abierta || !dialogo) return;
    const anterior = document.activeElement;
    dialogo.showModal();
    return () => {
      dialogo.close();
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
    };
  }, [abierta]);

  function mover(pasos) {
    const siguiente = fotos[indice + pasos];
    if (siguiente) setSeleccion(siguiente.id_foto);
  }

  const fecha = (valor) => {
    const instante = valor ? new Date(valor) : null;
    return instante && Number.isFinite(instante.getTime()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(instante) : '';
  };

  return <section className="space-y-5" aria-label="Galería de fotos">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className={'text-2xl font-bold ' + tema.title}>Fotos</h2><span className={'text-sm ' + tema.subtitle}>{fotos.length} {fotos.length === 1 ? 'fotografía' : 'fotografías'}</span></div>
    {!fotos.length ? <div className={'rounded-2xl border p-8 text-center space-y-3 ' + cardCls}><Icono nombre="image" className="mx-auto h-9 w-9 text-amber-500" /><p className={'font-semibold ' + tema.title}>Los momentos de nuestra comunidad, en un solo lugar</p><p className={'text-sm ' + tema.subtitle}>Las fotografías compartidas aparecerán aquí.</p></div> : <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {fotos.map((foto, posicion) => <article key={foto.id_foto} className={'overflow-hidden rounded-2xl border ' + cardCls}>
        <button type="button" className="group relative block w-full cursor-pointer overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400" aria-label={'Ver foto ' + (posicion + 1) + ' de ' + fotos.length} onClick={() => setSeleccion(foto.id_foto)}>
          <img src={foto.url_imagen} alt={foto.pie || 'Fotografía de ' + titulo} loading="lazy" decoding="async" className="w-full aspect-square object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.03]" />
          <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 p-2 text-white"><Icono nombre="maximize" className="h-4 w-4" /></span>
        </button>
        <div className="space-y-2 p-3 sm:p-4">
          {mostrarEstado && <EstadoActividad estado={foto.estado} />}
          {foto.pie && <p className={'text-sm whitespace-pre-line break-words line-clamp-3 ' + tema.text}>{foto.pie}</p>}
          {fecha(foto.creado_en) && <time className={'block text-xs ' + tema.subtitle} dateTime={foto.creado_en}>{fecha(foto.creado_en)}</time>}
          {acciones && <div className="flex flex-wrap gap-2 pt-1">{acciones(foto)}</div>}
        </div>
      </article>)}
    </div>}
    <dialog ref={dialogoRef} aria-label={'Fotografías de ' + titulo} className={'m-auto w-[calc(100%_-_2rem)] max-w-5xl max-h-[94dvh] overflow-y-auto rounded-2xl border p-0 backdrop:bg-black/80 ' + (modoOscuro ? 'bg-[#0e162c] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900')} onCancel={(evento) => { evento.preventDefault(); setSeleccion(null); }} onClick={(evento) => { if (evento.target === evento.currentTarget) setSeleccion(null); }} onKeyDown={(evento) => {
      if (evento.key === 'ArrowRight') { evento.preventDefault(); mover(1); }
      if (evento.key === 'ArrowLeft') { evento.preventDefault(); mover(-1); }
    }}>
      {fotoActual && <div>
        <header className="flex items-center justify-between gap-4 px-4 py-3"><div className="min-w-0"><p className="truncate font-semibold">{titulo}</p><p role="status" aria-live="polite" className={'text-sm ' + tema.subtitle}>{indice + 1} de {fotos.length}</p></div><button type="button" autoFocus aria-label="Cerrar galería" className="rounded-full p-3 cursor-pointer hover:bg-amber-400/15 focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => setSeleccion(null)}><Icono nombre="close" className="h-5 w-5" /></button></header>
        <div className="relative bg-slate-950" onTouchStart={(evento) => { const toque = evento.touches[0]; gestoRef.current = { x: toque.clientX, y: toque.clientY }; }} onTouchEnd={(evento) => {
          const inicio = gestoRef.current;
          const fin = evento.changedTouches[0];
          gestoRef.current = null;
          if (!inicio || !fin) return;
          const distancia = fin.clientX - inicio.x;
          if (Math.abs(distancia) > 45 && Math.abs(distancia) > Math.abs(fin.clientY - inicio.y) * 1.2) mover(distancia < 0 ? 1 : -1);
        }}>
          <img src={fotoActual.url_imagen} alt={fotoActual.pie || 'Fotografía de ' + titulo} className="w-full max-h-[65dvh] min-h-40 object-contain" />
          {indice > 0 && <button type="button" aria-label="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-3 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => mover(-1)}><Icono nombre="chevron-left" className="h-5 w-5" /></button>}
          {indice < fotos.length - 1 && <button type="button" aria-label="Foto siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-3 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => mover(1)}><Icono nombre="chevron-right" className="h-5 w-5" /></button>}
        </div>
        <footer className="space-y-2 px-4 py-4">{mostrarEstado && <EstadoActividad estado={fotoActual.estado} />}{fotoActual.pie && <p className="whitespace-pre-line break-words">{fotoActual.pie}</p>}{fecha(fotoActual.creado_en) && <time className={'block text-sm ' + tema.subtitle} dateTime={fotoActual.creado_en}>{fecha(fotoActual.creado_en)}</time>}</footer>
      </div>}
    </dialog>
  </section>;
}
