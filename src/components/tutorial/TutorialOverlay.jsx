import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function TutorialOverlay({ pasos, paso, onSiguiente, onSaltar }) {
  const { modoOscuro } = useTheme();
  const [rect, setRect] = useState(null);
  const [altoTarjeta, setAltoTarjeta] = useState(0);
  const actual = pasos[paso];

  useEffect(() => {
    if (!actual?.target) { setRect(null); return; }
    let elementoActual = null;
    let frame = 0;
    const buscarVisible = () => [...document.querySelectorAll(actual.target)].find((elemento) => {
      const estilo = window.getComputedStyle(elemento);
      const caja = elemento.getBoundingClientRect();
      return estilo.display !== 'none' && estilo.visibility !== 'hidden' && caja.width > 0 && caja.height > 0;
    }) ?? null;
    const medir = (desplazar = false) => {
      const siguiente = buscarVisible();
      if (siguiente !== elementoActual) {
        elementoActual = siguiente;
        if (elementoActual && desplazar) elementoActual.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (!elementoActual) { setRect(null); return; }
      const caja = elementoActual.getBoundingClientRect();
      const nuevoRect = { top: caja.top, left: caja.left, width: caja.width, height: caja.height };
      setRect((anterior) => anterior
        && anterior.top === nuevoRect.top
        && anterior.left === nuevoRect.left
        && anterior.width === nuevoRect.width
        && anterior.height === nuevoRect.height
        ? anterior
        : nuevoRect);
    };
    const alCambiarTamano = () => {
      medir(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => medir(true));
    };
    const alMutarDom = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => medir(true));
    };
    const observadorDom = new MutationObserver(alMutarDom);
    observadorDom.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    const observadorTamano = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => medir(false));
    observadorTamano?.observe(document.documentElement);
    medir(true);
    window.addEventListener('resize', alCambiarTamano);
    window.addEventListener('scroll', medir, true);
    return () => {
      cancelAnimationFrame(frame);
      observadorDom.disconnect();
      observadorTamano?.disconnect();
      window.removeEventListener('resize', alCambiarTamano);
      window.removeEventListener('scroll', medir, true);
    };
  }, [actual]);

  if (!actual) return null;

  const margen = 6;
  const top = rect ? Math.max(0, rect.top - margen) : 0;
  const left = rect ? Math.max(0, rect.left - margen) : 0;
  const right = rect ? Math.min(window.innerWidth, rect.left + rect.width + margen) : 0;
  const bottom = rect ? Math.min(window.innerHeight, rect.top + rect.height + margen) : 0;
  const pasoDeNavegacionMovil = window.matchMedia('(max-width: 767px)').matches
    && actual.target?.startsWith('button[data-tutorial=');
  const posicionTarjeta = pasoDeNavegacionMovil
    ? { top: 'auto', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }
    : rect && altoTarjeta > 0 && bottom + altoTarjeta + 14 < window.innerHeight
      ? { top: bottom + 14, bottom: 'auto' }
      : { top: 'auto', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' };

  return (
    <div className="fixed inset-0 z-[200]">
      {rect && (
        <>
          <div className="tutorial-velo-segmento absolute inset-x-0 top-0 bg-black/65" style={{ height: top }} />
          <div className="tutorial-velo-segmento absolute inset-x-0 bottom-0 bg-black/65" style={{ top: bottom }} />
          <div className="tutorial-velo-segmento absolute bg-black/65" style={{ top, left: 0, width: left, height: bottom - top }} />
          <div className="tutorial-velo-segmento absolute bg-black/65" style={{ top, left: right, right: 0, height: bottom - top }} />
          <div
            className="tutorial-foco absolute rounded-xl border-2 border-amber-400 pointer-events-none"
            style={{ top, left, width: right - left, height: bottom - top, boxShadow: '0 0 14px rgba(251,191,36,0.75)' }}
          />
        </>
      )}
      {!rect && <div className="absolute inset-0 bg-black/65" />}
      <div
        key={paso}
        ref={(elemento) => setAltoTarjeta(elemento?.getBoundingClientRect().height ?? 0)}
        className={`tutorial-tarjeta-entrada absolute left-1/2 -translate-x-1/2 w-[calc(100%_-_2rem)] max-w-md max-h-[calc(100dvh_-_8rem)] overflow-y-auto rounded-2xl p-5 border shadow-2xl ${modoOscuro ? 'bg-[#0e162c] border-slate-700/70' : 'bg-white border-slate-200'}`}
        style={posicionTarjeta}
      >
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
