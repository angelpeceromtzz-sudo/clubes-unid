/* Botón que envuelve la fotografía principal de una noticia y abre el visor a
   pantalla completa. El estado vive aquí para que, al cambiar de publicación o
   cerrar el modal, el visor se desmonte junto con su imagen y no reutilice una
   fotografía anterior. El botón puede ser la propia tarjeta de imagen o una
   capa transparente sobre un banner (según las clases que reciba). */
import { useState } from 'react';
import { Icono } from './Icono';
import { VisorImagen } from './VisorImagen';

export function ImagenAmpliable({
  src,
  alt = '',
  titulo = '',
  className = '',
  children,
  mostrarPista = true,
  textoPista = 'Ampliar',
}) {
  const [abierta, setAbierta] = useState(false);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ampliar imagen de ${titulo || alt || 'la publicación'}`}
        aria-haspopup="dialog"
        className={className}
      >
        {children}
        {mostrarPista && (
          <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/55 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm transition-colors group-hover:bg-black/75 group-focus-within:bg-black/75">
            <Icono nombre="maximize" className="h-3.5 w-3.5" strokeWidth={2.2} />
            {textoPista}
          </span>
        )}
      </button>

      <VisorImagen
        abierto={abierta}
        src={src}
        alt={alt}
        titulo={titulo}
        onClose={() => setAbierta(false)}
      />
    </>
  );
}
