import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { TarjetaMural } from './TarjetaMural';
import { clavePublicacionMural } from '../../utils/mural';

export function MuralCalendario({ publicaciones, onDetalle, onEditar, puedeEditar, onCrear, onCompartir, error, onReintentar }) {
  const { tema, modoOscuro } = useTheme();
  const [limite, setLimite] = useState(6);
  return (
    <section aria-labelledby="titulo-mural" className={`relative overflow-hidden rounded-2xl border px-4 py-5 sm:px-6 sm:py-6 ${modoOscuro ? 'border-slate-700/60 bg-[#111b30]' : 'border-[#e6dfd2] bg-[#f4f0e7]'}`} style={{ backgroundImage: `radial-gradient(${modoOscuro ? '#33415565' : '#d5ccb955'} 1px, transparent 1px)`, backgroundSize: '16px 16px' }}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${modoOscuro ? 'text-blue-300' : 'text-blue-700'}`}>Comunidad UNID</p><h2 id="titulo-mural" className={`text-xl font-black tracking-tight ${tema.title}`}>Mural del campus</h2><p className={`mt-1 text-xs ${tema.subtitle}`}>{publicaciones.length} {publicaciones.length === 1 ? 'publicación para la comunidad' : 'publicaciones para la comunidad'}</p></div>
        <div className="flex flex-wrap gap-2">{onCompartir && <button type="button" onClick={onCompartir} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${modoOscuro ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}><Icono nombre="qr" className="h-4 w-4" />Compartir / QR</button>}{onCrear && <button type="button" onClick={onCrear} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"><Icono nombre="plus" className="h-4 w-4" />Nueva publicación</button>}</div>
      </header>
      {error && <p role="alert" className="mb-4 text-sm text-red-500">{error} <button type="button" onClick={onReintentar} className="underline cursor-pointer">Reintentar</button></p>}
      {publicaciones.length === 0 ? <div className={`rounded-2xl border px-6 py-12 text-center ${modoOscuro ? 'border-slate-700 bg-slate-900/50' : 'border-white bg-white/70'}`}><Icono nombre="newspaper" className={`mx-auto mb-4 h-8 w-8 ${tema.subtitle}`} /><h3 className={`text-sm font-bold ${tema.title}`}>Las próximas novedades estarán aquí</h3><p className={`mt-2 text-xs ${tema.subtitle}`}>Noticias, carteles, fechas y avisos de nuestra comunidad.</p>{onCrear && <button type="button" onClick={onCrear} className="mt-5 text-xs font-bold text-amber-600 underline cursor-pointer">Crear la primera publicación</button>}</div> : <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">{publicaciones.slice(0, limite).map((item) => <TarjetaMural key={clavePublicacionMural(item)} item={item} onDetalle={onDetalle} onEditar={!puedeEditar || puedeEditar(item) ? onEditar : undefined} />)}</div>}
      {publicaciones.length > 6 && <div className="mt-6 text-center"><button type="button" onClick={() => setLimite(limite >= publicaciones.length ? 6 : limite + 6)} className={`rounded-xl border px-4 py-2 text-xs font-bold cursor-pointer ${modoOscuro ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-white bg-white/80 text-slate-600'}`}>{limite >= publicaciones.length ? 'Ver menos' : `Ver más publicaciones (${publicaciones.length - limite})`}</button></div>}
    </section>
  );
}
