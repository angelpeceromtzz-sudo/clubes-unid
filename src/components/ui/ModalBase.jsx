/* Modal base con overlay, cierre al hacer clic fuera y ancho configurable (max-w-*).
   Controlado por props `show` y `onClose`. Renderizado vía portal al body. */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';

let portalDiv = null;
function getPortalContainer() {
  if (!portalDiv) {
    portalDiv = document.createElement('div');
    document.body.appendChild(portalDiv);
  }
  return portalDiv;
}

export function ModalBase({ show, onClose, maxWidth = 'max-w-lg', children }) {
  const { tema } = useTheme();
  const [container] = useState(getPortalContainer);

  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div
        className={`relative rounded-2xl w-full ${maxWidth} max-h-[85vh] overflow-y-auto p-8 border scrollbar-amber ${tema.isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    container,
  );
}
