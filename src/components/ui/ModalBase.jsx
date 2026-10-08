/* Modal base con overlay, cierre al hacer clic fuera y ancho configurable (max-w-*).
   Controlado por props `show` y `onClose`. Renderizado vía portal al body.

   Con `externalClose` la X de cerrar se monta sobre la esquina de la tarjeta,
   fuera del contenedor con scroll, para que quede fija y sólo el contenido se
   mueva. El scroll vive en un div interno porque un elemento (la tarjeta) con
   `overflow` propio no puede mostrar contenido fuera de su caja: al moverle el
   scroll al hijo, la tarjeta queda como marco estable. */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { BotonCerrar } from './BotonCerrar';

let portalDiv = null;
function getPortalContainer() {
  if (!portalDiv) {
    portalDiv = document.createElement('div');
    document.body.appendChild(portalDiv);
  }
  return portalDiv;
}

export function ModalBase({ show, onClose, maxWidth = 'max-w-lg', closeOnBackdrop = true, externalClose = false, children }) {
  const { tema } = useTheme();
  const [container] = useState(getPortalContainer);

  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={closeOnBackdrop ? onClose : undefined}>
      <div
        /* El color de texto va aquí y no en cada hijo. El modal se monta en un
           portal sobre document.body, fuera del div raíz de la app que sí lleva
           `tema.text`, así que sin esto todo texto sin color propio heredaba el
           negro por defecto del navegador: en oscuro quedaba negro sobre
           `bg-[#0e162c]`, ilegible. */
        className={`relative rounded-2xl w-full ${maxWidth} border ${tema.isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'} ${tema.text}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* La X se sale de la tarjeta (`-top`/`-right` negativos) y por eso
            necesita el círculo: separa el botón del overlay oscuro y le da
            el mismo formato estándar (blanca y ámbar al hover). Al no llevar
            scroll, el borde de la tarjeta no la recorta. El `flex` evita el
            hueco de línea del botón en línea (su línea base deja espacio
            debajo): sin él el círculo quedaba más ancho hacia abajo y la X
            descentrada. */}
        {externalClose && (
          <div
            className={`absolute -top-4 -right-4 z-20 flex rounded-full p-2 border shadow-lg ${
              tema.isDark ? 'bg-[#0e162c] border-slate-600' : 'bg-white border-slate-200'
            }`}
          >
            <BotonCerrar onClick={onClose} etiqueta="Cerrar" />
          </div>
        )}
        <div className="max-h-[85vh] overflow-y-auto p-8 scrollbar-amber">
          {children}
        </div>
      </div>
    </div>,
    container,
  );
}
