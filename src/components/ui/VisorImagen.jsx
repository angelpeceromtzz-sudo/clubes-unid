/* Visor de imagen a pantalla completa para las fotografías principales de las
   noticias. Se monta en un portal sobre el body para quedar por encima de los
   modales de noticias (z-[100]) y del detalle móvil (z-[60]). La imagen usa
   `object-contain` para mostrarse completa, sin el recorte de las tarjetas.

   Accesibilidad: role="dialog" + aria-modal, foco inicial en la X, Escape y
   clic en el fondo cierran, Tab queda dentro del visor y al cerrar el foco
   vuelve al botón que lo abrió. El portal detiene la propagación para que el
   clic dentro del visor no cierre también el modal de noticias que lo contiene. */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from './Icono';

export function VisorImagen({ abierto, src, alt = '', titulo = '', onClose }) {
  const cerrarRef = useRef(null);
  const focoPrevioRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // El modal que contiene al visor ya bloquea el scroll del documento, así que
  // no se repite el bloqueo aquí (evita restauraciones anidadas al cerrar).

  // Mantiene la última versión del callback sin reiniciar el efecto de apertura
  // cada vez que el modal padre se vuelve a renderizar (onClose suele ser inline).
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!abierto || !src) return;

    focoPrevioRef.current = document.activeElement;
    cerrarRef.current?.focus();

    function alPulsarTecla(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      // Sólo la X es interactiva: el Tab no debe salir del visor hacia el modal
      // que queda detrás.
      if (evento.key === 'Tab') {
        evento.preventDefault();
        cerrarRef.current?.focus();
      }
    }

    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('keydown', alPulsarTecla);
      const previo = focoPrevioRef.current;
      if (previo instanceof HTMLElement && document.contains(previo)) previo.focus();
    };
  }, [abierto, src]);

  if (!abierto || !src) return null;

  const etiqueta = titulo ? `Imagen ampliada: ${titulo}` : 'Imagen ampliada';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-6"
      onClick={(evento) => {
        evento.stopPropagation();
        onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        className="relative flex max-h-full w-fit max-w-full flex-col items-center"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="relative w-fit max-w-full">
          <img draggable={false}
            src={src}
            alt={alt || titulo}
            className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl sm:max-h-[80vh]"
          />

          <button
            ref={cerrarRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar imagen ampliada"
            title="Cerrar imagen ampliada"
            className="absolute top-3 right-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/60 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <Icono nombre="close" strokeWidth={2.5} className="h-5 w-5" />
          </button>
        </div>

        {titulo && (
          <p className="mt-3 line-clamp-2 max-w-3xl text-center text-sm font-semibold text-white/90">
            {titulo}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
