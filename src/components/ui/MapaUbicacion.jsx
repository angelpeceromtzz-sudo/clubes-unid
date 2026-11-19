import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CENTRO_CAMPECHE = [19.8301, -90.5349];
const PIN = L.divIcon({
  className: '',
  html: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44"><path d="M16 42S2 26 2 16a14 14 0 1 1 28 0c0 10-14 26-14 26Z" fill="#f59e0b" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="#0e162c"/></svg>',
  iconSize: [32, 44], iconAnchor: [16, 43],
});

function ControlesMapa({ coordenadas, onSeleccionar }) {
  const map = useMap();
  const latitud = coordenadas?.[0], longitud = coordenadas?.[1];
  useEffect(() => { map.getContainer().setAttribute('aria-label', 'Mapa: usa las flechas para moverlo'); }, [map]);
  useEffect(() => {
    if (latitud != null && longitud != null) map.panTo([latitud, longitud]);
  }, [latitud, longitud, map]);
  useMapEvents({ click(evento) { onSeleccionar?.(evento.latlng.lat, evento.latlng.lng); } });
  if (!onSeleccionar) return null;
  return <>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[450] flex items-center justify-center"><span className="rounded-full border-2 border-slate-900 bg-white/80 p-1 shadow"><span className="block h-1 w-1 rounded-full bg-slate-900" /></span></div>
    <div className="absolute left-3 top-3 z-[1000]" ref={(elemento) => { if (elemento) L.DomEvent.disableClickPropagation(elemento); }}>
      <button type="button" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow focus-visible:outline-2 focus-visible:outline-amber-500" onClick={() => { const centro = map.getCenter(); onSeleccionar(centro.lat, centro.lng); }}>Usar el centro del mapa</button>
    </div>
  </>;
}

export default function MapaUbicacion({ coordenadas, onSeleccionar, disabled = false }) {
  const [errorMapa, setErrorMapa] = useState(false);
  return <div inert={disabled || undefined} className="space-y-2">
    <div role="region" aria-label="Mapa del punto de encuentro" className="relative isolate overflow-hidden rounded-xl border border-slate-300">
      <MapContainer center={coordenadas || CENTRO_CAMPECHE} zoom={coordenadas ? 16 : 13} className="h-72 w-full bg-slate-100 text-slate-900" zoomControl={false} scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} eventHandlers={{ tileerror: () => setErrorMapa(true) }} />
        <ZoomControl position="topright" zoomInTitle="Acercar" zoomOutTitle="Alejar" />
        <ControlesMapa coordenadas={coordenadas} onSeleccionar={disabled ? undefined : onSeleccionar} />
        {coordenadas && <Marker position={coordenadas} icon={PIN} interactive={false} keyboard={false} />}
      </MapContainer>
    </div>
    {errorMapa && <p role="status" className="text-sm">No se pudo cargar parte del mapa. Puedes pegar un enlace de Google Maps.</p>}
  </div>;
}
