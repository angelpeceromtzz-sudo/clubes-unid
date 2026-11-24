import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { EstadoActividad } from './ActividadUI';

export function GaleriaSocialActividad({ fotos = [], titulo, mostrarEstado = false, acciones, puedeAprobar = false, onRevisar }) {
  const { tema, cardCls, modoOscuro } = useTheme();
  const [seleccion, setSeleccion] = useState(null);
  const dialogoRef = useRef(null);
  const indice = fotos.findIndex((foto) => foto.id_foto === seleccion);
  const fotoActual = fotos[indice];
  const abierta = Boolean(fotoActual);

  function mover(pasos) {
    const siguiente = fotos[indice + pasos];
    if (siguiente) setSeleccion(siguiente.id_foto);
  }

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

  const fecha = (valor) => {
    const instante = valor ? new Date(valor) : null;
    return instante && Number.isFinite(instante.getTime())
      ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(instante)
      : '';
  };

  if (!fotos.length) {
    return <section className="space-y-5" aria-label="Galería social">
      <div className={'rounded-2xl border p-8 text-center space-y-3 ' + cardCls}>
        <Icono nombre="image" className="mx-auto h-9 w-9 text-amber-500" />
        <p className={'font-semibold ' + tema.title}>Los momentos de nuestra comunidad, en un solo lugar</p>
        <p className={'text-sm ' + tema.subtitle}>Las fotografías compartidas aparecerán aquí.</p>
      </div>
    </section>;
  }

  return <section className="space-y-5" aria-label="Galería social">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className={'text-2xl font-bold ' + tema.title}>Momentos compartidos</h2>
      <span className={'text-sm ' + tema.subtitle}>{fotos.length} {fotos.length === 1 ? 'fotografía' : 'fotografías'}</span>
    </div>
    <div className="space-y-5">
      {fotos.map((foto, posicion) => (
        <article key={foto.id_foto} className={'overflow-hidden rounded-2xl border ' + cardCls}>
          {/* Cabecera del post */}
          <header className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${modoOscuro ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
              {foto.id_autor ? '👤' : '🎉'}
            </div>
            <div className="min-w-0 flex-1">
              <p className={'font-semibold ' + tema.title}>{foto.autor_nombre || 'Participante'}</p>
              {fecha(foto.creado_en) && <time className={'text-xs ' + tema.subtitle} dateTime={foto.creado_en}>{fecha(foto.creado_en)}</time>}
            </div>
            {mostrarEstado && <EstadoActividad estado={foto.estado} />}
          </header>
          {/* Imagen */}
          <button type="button" className="group relative block w-full cursor-pointer overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400" aria-label={'Ver foto ' + (posicion + 1) + ' de ' + fotos.length} onClick={() => setSeleccion(foto.id_foto)}>
            <img src={foto.url_imagen} alt={foto.pie || 'Fotografía de ' + titulo} loading="lazy" decoding="async" className="w-full aspect-[4/3] object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]" />
            <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 p-2 text-white"><Icono nombre="maximize" className="h-4 w-4" /></span>
          </button>
          {/* Pie y acciones */}
          <div className="space-y-3 p-4">
            {foto.pie && <p className={'text-sm whitespace-pre-line break-words ' + tema.text}>{foto.pie}</p>}
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" className={`flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-amber-300' : 'text-slate-500 hover:text-amber-600'}`}>
                <Icono nombre="heart" className="h-5 w-5" /> Me gusta
              </button>
              <button type="button" className={`flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-amber-300' : 'text-slate-500 hover:text-amber-600'}`}>
                <Icono nombre="message-circle" className="h-5 w-5" /> Comentar
              </button>
              {puedeAprobar && onRevisar && foto.estado !== 'publicada' && <BotonAccion size="sm" onClick={() => onRevisar(foto, 'publicada')}>Publicar</BotonAccion>}
              {puedeAprobar && onRevisar && foto.estado === 'pendiente' && <BotonAccion size="sm" variant="outline" onClick={() => onRevisar(foto, 'rechazada')}>Rechazar</BotonAccion>}
              {puedeAprobar && onRevisar && <BotonAccion size="sm" variant="outline" onClick={() => onRevisar(foto, 'eliminada')}>Retirar</BotonAccion>}
              {acciones && <div className="flex flex-wrap gap-2 ml-auto">{acciones(foto)}</div>}
            </div>
          </div>
        </article>
      ))}
    </div>
    <dialog ref={dialogoRef} aria-label={'Fotografías de ' + titulo} className={'m-auto w-[calc(100%_-_2rem)] max-w-5xl max-h-[94dvh] overflow-y-auto rounded-2xl border p-0 backdrop:bg-black/80 ' + (modoOscuro ? 'bg-[#0e162c] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900')} onCancel={(evento) => { evento.preventDefault(); setSeleccion(null); }} onClick={(evento) => { if (evento.target === evento.currentTarget) setSeleccion(null); }} onKeyDown={(evento) => {
      if (evento.key === 'ArrowRight') { evento.preventDefault(); mover(1); }
      if (evento.key === 'ArrowLeft') { evento.preventDefault(); mover(-1); }
    }}>
      {fotoActual && <div>
        <header className="flex items-center justify-between gap-4 px-4 py-3"><div className="min-w-0"><p className="truncate font-semibold">{titulo}</p><p role="status" aria-live="polite" className={'text-sm ' + tema.subtitle}>{indice + 1} de {fotos.length}</p></div><button type="button" autoFocus aria-label="Cerrar galería" className="rounded-full p-3 cursor-pointer hover:bg-amber-400/15 focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => setSeleccion(null)}><Icono nombre="close" className="h-5 w-5" /></button></header>
        <div className="relative bg-slate-950">
          <img src={fotoActual.url_imagen} alt={fotoActual.pie || 'Fotografía de ' + titulo} className="mx-auto max-h-[80dvh] w-full object-contain" />
          {fotos.length > 1 && <><button type="button" aria-label="Foto anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-3 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => mover(-1)}><Icono nombre="chevron-left" className="h-5 w-5" /></button><button type="button" aria-label="Foto siguiente" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-3 text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400" onClick={() => mover(1)}><Icono nombre="chevron-right" className="h-5 w-5" /></button></>}
        </div>
        {fotoActual.pie && <p className={'whitespace-pre-line break-words px-4 py-3 text-sm ' + tema.text}>{fotoActual.pie}</p>}
      </div>}
    </dialog>
  </section>;
}