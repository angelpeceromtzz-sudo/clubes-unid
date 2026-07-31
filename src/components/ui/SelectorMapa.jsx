import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MARKER_ICON = new L.DivIcon({
  className: '',
  html: `<div style="width:28px;height:42px;">
    <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="42">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="#f59e0b" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="#fff"/>
    </svg>
  </div>`,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -42],
});

const CENTRO_DEFAULT = [19.8301, -90.5349];

function ClickHandler({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.panTo(center);
  }, [center, map]);
  return null;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    if (data?.address) {
      const a = data.address;
      const parts = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.state].filter(Boolean);
      return { direccion: parts.join(', '), completa: data.display_name };
    }
  } catch { /* Geocoding no disponible */ }
  return { direccion: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, completa: '' };
}

function construirGoogleMapsLink(lat, lng) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function SelectorMapa({ valorLugar, valorUbicacion, onCambio, modoOscuro, className = '' }) {
  const [coordenadas, setCoordenadas] = useState(() => {
    if (valorUbicacion) {
      const m = valorUbicacion.match(/@?(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    }
    return null;
  });
  const [buscandoDir, setBuscandoDir] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const handleMapClick = useCallback(async (latlng) => {
    setCoordenadas([latlng.lat, latlng.lng]);
    setBuscandoDir(true);
    const geo = await reverseGeocode(latlng.lat, latlng.lng);
    setBuscandoDir(false);
    onCambio({
      lugar: geo.direccion,
      ubicacion_maps: construirGoogleMapsLink(latlng.lat, latlng.lng),
    });
  }, [onCambio]);

  return (
    <div className={`rounded-xl border overflow-hidden ${className}
      ${modoOscuro ? 'border-slate-700' : 'border-slate-300'}`}>
      <button type="button" onClick={() => setExpandido(!expandido)}
        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer
          ${modoOscuro ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
        <span className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Seleccionar en mapa
          {coordenadas && (
            <span className={`text-[10px] font-normal normal-case tracking-normal
              ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
              ({coordenadas[0].toFixed(4)}, {coordenadas[1].toFixed(4)})
            </span>
          )}
        </span>
        <svg className={`w-4 h-4 transition-transform ${expandido ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandido && (
        <div className={`relative ${modoOscuro ? 'bg-[#0e162c]' : 'bg-white'}`}>
          <MapContainer
            center={coordenadas || CENTRO_DEFAULT}
            zoom={coordenadas ? 16 : 13}
            className="w-full h-64"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ZoomControl position="bottomright" />
            <ClickHandler onMapClick={handleMapClick} />
            <RecenterMap center={coordenadas} />
            {coordenadas && <Marker position={coordenadas} icon={MARKER_ICON} />}
          </MapContainer>

          {buscandoDir && (
            <div className="absolute bottom-2 right-2 z-[1000] bg-amber-400 text-[#0e162c] text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
              Buscando dirección...
            </div>
          )}

          {coordenadas && !buscandoDir && valorLugar && (
            <div className={`px-3 py-2 text-xs border-t
              ${modoOscuro ? 'bg-[#0e162c] border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
              <span className="text-amber-500">📍</span> {valorLugar}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
