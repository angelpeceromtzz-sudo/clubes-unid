import { useState } from 'react';

const COLORES_ESTATUS = {
  'Pendiente': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'En revisión': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Preseleccionado': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Convocado': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'Admitido': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Aceptado': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Rechazado': 'bg-red-500/20 text-red-400 border-red-500/30',
};

const BORDES_ESTATUS = {
  'Pendiente': 'border-l-yellow-500',
  'En revisión': 'border-l-blue-500',
  'Preseleccionado': 'border-l-purple-500',
  'Convocado': 'border-l-indigo-500',
  'Admitido': 'border-l-emerald-500',
  'Aceptado': 'border-l-emerald-500',
  'Rechazado': 'border-l-red-500',
};

const ICONOS_ESTATUS = {
  'Pendiente': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  'En revisión': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  'Preseleccionado': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  'Convocado': 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  'Admitido': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  'Aceptado': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  'Rechazado': 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

const MENSAJES_ESTATUS = {
  'Pendiente': 'Esperando revisión del presidente',
  'En revisión': 'El presidente está revisando tu solicitud',
  'Preseleccionado': '¡Has pasado a la siguiente etapa!',
  'Convocado': 'Revisa los detalles de tu convocatoria',
  'Admitido': '¡Bienvenido al club!',
  'Aceptado': 'Has sido aceptado en el club',
  'Rechazado': 'Tu solicitud no fue aceptada',
};

const DETALLES_BASE = [
  { key: 'carrera', label: 'Carrera' },
  { key: 'turno', label: 'Turno' },
  { key: 'cuatrimestre', label: 'Cuatrimestre', formatter: (v) => `${v}°` },
  { key: 'bloque_asignado', label: 'Bloque', formatter: (v) => (v !== 'E' ? `Bloque ${v}` : 'Sin asignar') },
];

function TarjetaPostulacion({ postulacion, tema, isOpen, onToggle }) {
  const colorEstatus = COLORES_ESTATUS[postulacion.status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  const bordeEstatus = BORDES_ESTATUS[postulacion.status] || 'border-l-slate-500';
  const icono = ICONOS_ESTATUS[postulacion.status] || 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
  const mensaje = MENSAJES_ESTATUS[postulacion.status] || '';

  return (
    <div className={`border-l-4 ${bordeEstatus} rounded-r-2xl border overflow-hidden ${tema.isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            {postulacion.imagen_portada ? (
              <img src={postulacion.imagen_portada} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <h3 className={`text-base font-bold truncate ${tema.isDark ? 'text-white' : 'text-slate-900'}`}>
                {postulacion.nombre_club}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {postulacion.categoria} · {new Date(postulacion.fecha_envio).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] uppercase font-bold px-3 py-1 rounded-full border ${colorEstatus}`}>
            {postulacion.status}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 ${colorEstatus.split(' ')[0]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icono} />
          </svg>
          <span className={`text-xs font-medium ${tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {mensaje}
          </span>
        </div>

        <div className={`mt-3 mb-3 border-t ${tema.isDark ? 'border-slate-700/50' : 'border-slate-200'}`} />

        <button
          onClick={onToggle}
          className={`text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${tema.isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {isOpen ? 'Ocultar detalles' : 'Ver detalles'}
        </button>

        {isOpen && (
          <div className={`mt-3 rounded-xl p-4 space-y-4 ${tema.isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {DETALLES_BASE.map(({ key, label, formatter }) => {
                const valor = postulacion[key];
                return (
                  <div key={key}>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</span>
                    <p className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>
                      {formatter ? formatter(valor) : valor}
                    </p>
                  </div>
                );
              })}
            </div>

            {postulacion.convocatorias && postulacion.convocatorias.length > 0 && (
              <div className={`border-t pt-4 ${tema.isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <p className={`text-[11px] uppercase tracking-wider font-bold mb-3 ${tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Convocatorias
                </p>
                <div className="space-y-2">
                  {postulacion.convocatorias.map((conv) => (
                    <div key={conv.id_convocatoria} className={`rounded-lg p-3 ${tema.isDark ? 'bg-[#0e162c]' : 'bg-white border border-slate-200'}`}>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg shrink-0">📅</span>
                        <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>
                          {new Date(conv.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1.5">
                        <span className="text-lg shrink-0">⏰</span>
                        <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>{conv.hora}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1.5">
                        <span className="text-lg shrink-0">📍</span>
                        <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>{conv.lugar}</span>
                      </div>
                      {conv.descripcion && (
                        <p className={`text-xs mt-2 ${tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>{conv.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SeccionPostulaciones({ postulaciones, tema }) {
  const [abiertos, setAbiertos] = useState({});

  function toggleDetalles(key) {
    setAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!postulaciones || postulaciones.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>
            Mis Postulaciones
          </h2>
          <p className={`text-sm mt-0.5 ${tema.subtitle}`}>
            {postulaciones.length} postulación{postulaciones.length !== 1 ? 'es' : ''} enviada{postulaciones.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {postulaciones.map((p, i) => {
          const cardKey = p.id_formulario ?? `idx-${i}`;
          return (
            <TarjetaPostulacion
              key={cardKey}
              postulacion={p}
              tema={tema}
              isOpen={!!abiertos[cardKey]}
              onToggle={() => toggleDetalles(cardKey)}
            />
          );
        })}
      </div>
    </div>
  );
}
