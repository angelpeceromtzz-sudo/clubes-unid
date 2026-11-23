import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function TutorialOverlay({ pasos, paso, onSiguiente, onSaltar }) {
  const { modoOscuro } = useTheme();
  const [rect, setRect] = useState(null);
  const actual = pasos[paso];

  useEffect(() => {
    if (!actual?.target) { setRect(null); return; }
    const el = document.querySelector(actual.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [actual]);

  if (!actual) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/60" onClick={onSaltar} />
      {rect && (
        <div
          className="absolute border-2 border-amber-400 rounded-xl pointer-events-none"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
        />
      )}
      <div className={`absolute left-1/2 -translate-x-1/2 bottom-8 w-[90%] max-w-md rounded-2xl p-5 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-lg'}`}>
        <h3 className={`text-base font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{actual.titulo}</h3>
        <p className={`text-sm mt-2 ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{actual.texto}</p>
        <div className="flex justify-between mt-4">
          <button onClick={onSaltar} className="text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer">Saltar</button>
          <button onClick={onSiguiente} className="bg-amber-400 text-[#0e162c] font-black text-xs uppercase tracking-wider rounded-xl px-4 py-2 cursor-pointer">
            {paso + 1 >= pasos.length ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}