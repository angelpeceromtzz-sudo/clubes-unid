import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export function TablaDesplegable({ titulo, subtitulo, children, abiertoInicial = false }) {
  const { modoOscuro } = useTheme();
  const [abierto, setAbierto] = useState(abiertoInicial);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600"
        aria-expanded={abierto}
      >
        <span className={`transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}>▶</span>
        {abierto ? 'Ocultar detalle' : titulo}
      </button>
      {subtitulo && !abierto && <p className={`text-xs mt-1 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>{subtitulo}</p>}
      {abierto && (
        <div className="mt-3 overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
}
