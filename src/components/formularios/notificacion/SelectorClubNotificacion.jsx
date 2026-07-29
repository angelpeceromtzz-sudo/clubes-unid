import { useState } from 'react';
import { Icono } from '../../ui/Icono';

export function SelectorClubNotificacion({ clubSeleccionado, setClubSeleccionado, clubes, modoOscuro, inputClass }) {
  const [busquedaClub, setBusquedaClub] = useState('');
  const [listaAbierta, setListaAbierta] = useState(false);

  const clubesActivos = (clubes || []).filter((c) => c.id_estatus_club === 1);
  const clubesFiltrados = busquedaClub.trim()
    ? clubesActivos.filter((c) =>
        c.nombre_club.toLowerCase().includes(busquedaClub.toLowerCase().trim())
      )
    : clubesActivos;

  if (clubSeleccionado && !listaAbierta) {
    return (
      <button type="button"
        onClick={() => { setListaAbierta(true); setBusquedaClub(''); }}
        className={`flex items-center gap-2 w-full rounded-xl border px-4 py-3 text-sm transition-colors cursor-pointer ${modoOscuro ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
      >
        <Icono nombre="check-circle" strokeWidth={2} className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left font-medium">
          {clubesActivos.find((c) => String(c.id_club) === clubSeleccionado)?.nombre_club || 'Club seleccionado'}
        </span>
        <Icono nombre="edit" strokeWidth={2} className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
    );
  }

  return (
    <>
      <div className="relative">
        <Icono nombre="search" strokeWidth={2} className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
        <input type="text" value={busquedaClub} onChange={(e) => setBusquedaClub(e.target.value)}
          placeholder="Buscar club..."
          className={`${inputClass} pl-10`}
        />
      </div>
      <div className={`max-h-48 overflow-y-auto rounded-xl border ${modoOscuro ? 'border-slate-700' : 'border-slate-200'}`}>
        <button type="button"
          onClick={() => { setClubSeleccionado(''); setListaAbierta(false); }}
          className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${!clubSeleccionado ? (modoOscuro ? 'bg-amber-400/10 text-amber-400' : 'bg-amber-50 text-amber-700') : (modoOscuro ? 'text-slate-400 hover:bg-slate-800/50' : 'text-slate-500 hover:bg-slate-100')}`}
        >
          — Ninguno —
        </button>
        {clubesFiltrados.length > 0 ? (
          clubesFiltrados.map((c) => (
            <button key={c.id_club} type="button"
              onClick={() => { setClubSeleccionado(String(c.id_club)); setListaAbierta(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer border-t ${modoOscuro ? 'border-slate-700/50' : 'border-slate-100'} ${clubSeleccionado === String(c.id_club) ? (modoOscuro ? 'bg-amber-400/10 text-amber-400' : 'bg-amber-50 text-amber-700') : (modoOscuro ? 'text-slate-300 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-100')}`}
            >
              {c.nombre_club}
            </button>
          ))
        ) : (
          <div className={`px-4 py-3 text-sm text-center ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>— Sin resultados —</div>
        )}
      </div>
    </>
  );
}
