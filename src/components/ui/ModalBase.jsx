/* Modal base con overlay, cierre al hacer clic fuera y ancho configurable (max-w-*).
   Controlado por props `show` y `onClose`. */
import { useTheme } from '../../contexts/ThemeContext';

export function ModalBase({ show, onClose, maxWidth = 'max-w-lg', children }) {
  const { tema } = useTheme();
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div
        className={`rounded-2xl w-full ${maxWidth} p-8 border ${tema.isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
