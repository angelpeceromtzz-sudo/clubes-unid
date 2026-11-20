import { lazy, Suspense, useId, useState } from 'react';
import { MapPin, ExternalLink, Check, X } from 'lucide-react';
import { coordenadasEnlaceMapa, enlaceMapaCoordenadas, normalizarEnlaceMapa } from '../../../shared/ubicacionMaps.js';
import { useTheme } from '../../contexts/ThemeContext';

const MapaUbicacion = lazy(() => import('../ui/MapaUbicacion'));

export function LugarEdicionActividad({ lugar, ubicacionMaps = '', onChange, disabled, mostrarErrores }) {
  const { tema, inputCls } = useTheme();
  const id = useId();
  const coordenadas = coordenadasEnlaceMapa(ubicacionMaps);
  const [mostrarMapa, setMostrarMapa] = useState(Boolean(coordenadas));
  const [revisado, setRevisado] = useState(false);
  let enlace = '', error = '';
  try { enlace = normalizarEnlaceMapa(ubicacionMaps); } catch (fallo) { error = fallo.message; }
  const verError = Boolean(error && (revisado || mostrarErrores));
  const etiqueta = 'block space-y-2 text-sm font-semibold ' + tema.title;
  return <div className="space-y-4">
    <label className={etiqueta} htmlFor={id + '-lugar'}>Lugar o punto de encuentro *
      <input id={id + '-lugar'} className={inputCls} required value={lugar} maxLength={240} placeholder="Ej. UNID Campeche, entrada principal" aria-describedby={id + '-ayuda-lugar'} aria-invalid={mostrarErrores && !lugar.trim() || undefined} onChange={(evento) => onChange({ lugar: evento.target.value })} />
    </label>
    <p id={id + '-ayuda-lugar'} className={'text-sm ' + tema.subtitle}>Escribe el nombre del lugar y una referencia para llegar.</p>
    <div className={'space-y-4 rounded-xl border p-4 ' + (tema.isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><MapPin aria-hidden="true" size={18} className="text-amber-600 dark:text-amber-400" />Ubicación en el mapa <span className={'text-xs font-normal ' + tema.subtitle}>Opcional</span></div>
        <button type="button" disabled={disabled} aria-expanded={mostrarMapa} aria-controls={id + '-mapa'} className="min-h-11 rounded-lg border border-amber-500/50 px-3 py-2 text-sm font-semibold hover:bg-amber-400/10 focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-50" onClick={() => setMostrarMapa(!mostrarMapa)}>{mostrarMapa ? 'Ocultar mapa' : coordenadas ? 'Ajustar punto' : 'Marcar en el mapa'}</button>
      </div>
      {mostrarMapa && <div id={id + '-mapa'} className="space-y-3">
        <p className={'text-sm ' + tema.subtitle}>Toca el punto de encuentro. También puedes mover el mapa con las flechas y elegir su centro.</p>
        <Suspense fallback={<p role="status" className="flex h-72 items-center justify-center rounded-xl bg-slate-400/10 text-sm">Cargando mapa…</p>}><MapaUbicacion coordenadas={coordenadas} disabled={disabled} onSeleccionar={(lat, lng) => { setRevisado(false); onChange({ ubicacion_maps: enlaceMapaCoordenadas(lat, lng) }); }} /></Suspense>
      </div>}
      <label className={etiqueta} htmlFor={id + '-enlace'}>O pega un enlace del mapa
        <input id={id + '-enlace'} type="url" inputMode="url" autoComplete="off" className={inputCls} value={ubicacionMaps} maxLength={2048} placeholder="https://maps.app.goo.gl/…" aria-describedby={id + '-ayuda-enlace'} aria-invalid={verError || undefined} onBlur={() => setRevisado(true)} onChange={(evento) => onChange({ ubicacion_maps: evento.target.value })} />
      </label>
      <p id={id + '-ayuda-enlace'} role={verError ? 'alert' : undefined} className={'text-sm ' + (verError ? 'text-red-600 dark:text-red-400' : tema.subtitle)}>{verError ? error : 'En Google Maps, abre el lugar, elige Compartir y copia el enlace. También acepta OpenStreetMap.'}</p>
      {enlace && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/20 pt-3">
        <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><Check size={16} aria-hidden="true" />{coordenadas ? 'Punto de encuentro seleccionado' : 'Enlace del mapa agregado'}</p>
        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <a href={enlace} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4">Abrir mapa<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> en otra pestaña</span></a>
          <button type="button" disabled={disabled} className="inline-flex min-h-11 items-center gap-1 rounded py-1 hover:underline focus-visible:outline-2 focus-visible:outline-amber-500" onClick={() => { onChange({ ubicacion_maps: '' }); setRevisado(false); }}><X size={14} aria-hidden="true" />Quitar ubicación</button>
        </div>
      </div>}
    </div>
  </div>;
}

export function UbicacionEdicionActividad({ edicion }) {
  const { tema } = useTheme();
  let enlace;
  try { enlace = normalizarEnlaceMapa(edicion.ubicacion_maps); } catch { enlace = ''; }
  const coordenadas = coordenadasEnlaceMapa(enlace);
  return <div className="space-y-3">
    <p className="flex items-start gap-2 font-semibold"><MapPin size={19} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" /><span className="min-w-0 break-words">{edicion.lugar || 'Lugar por definir'}</span></p>
    {enlace && <>
      {coordenadas && <Suspense fallback={<p className={'text-sm ' + tema.subtitle}>Cargando ubicación…</p>}><MapaUbicacion coordenadas={coordenadas} /></Suspense>}
      <a href={enlace} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 underline underline-offset-4 dark:text-amber-300">Ver ubicación en el mapa<ExternalLink size={15} aria-hidden="true" /><span className="sr-only"> en otra pestaña</span></a>
    </>}
  </div>;
}
