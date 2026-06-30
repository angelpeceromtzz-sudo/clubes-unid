function TarjetaStat({ titulo, valor, icono, color }) {
  return (
    <div className={`rounded-xl border p-5 ${color} transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-80">{titulo}</p>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icono} />
        </svg>
      </div>
      <p className="text-3xl font-black mt-2">{valor ?? '—'}</p>
    </div>
  );
}

function BarraOcupacion({ nombre, maximo, ocupado, maxOcupado, esOscuro }) {
  const pct = maximo > 0 ? Math.round((ocupado / maximo) * 100) : 0;
  const anchoRelativo = maxOcupado > 0 ? Math.round((ocupado / maxOcupado) * 100) : 0;
  const colorBarra = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm w-44 truncate shrink-0">{nombre}</span>
      <div className={`flex-1 h-3 ${esOscuro ? 'bg-slate-700/50' : 'bg-slate-200'} rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full transition-all duration-500 ${colorBarra}`} style={{ width: `${Math.min(anchoRelativo, 100)}%` }} />
      </div>
      <span className="text-xs font-mono w-20 text-right shrink-0">{ocupado}/{maximo}</span>
      <span className="text-xs font-mono w-10 text-right shrink-0">{pct}%</span>
    </div>
  );
}

export function SeccionResumen({ stats, ocupacionClubes, topClubes, cargando, esOscuro }) {
  if (cargando) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" /></div>;
  }
  if (!stats) {
    return <p className="text-center py-10 text-slate-500">No hay datos disponibles</p>;
  }

  const solicitudesArr = stats.solicitudes || [];
  const totalPostulados = solicitudesArr.find(s => s.status === 'Postulado')?.total || 0;
  const totalPreseleccionados = solicitudesArr.find(s => s.status === 'Preseleccionado')?.total || 0;
  const totalMiembros = solicitudesArr.find(s => s.status === 'Miembro oficial')?.total || 0;
  const totalRechazados = solicitudesArr.find(s => s.status === 'Rechazado')?.total || 0;

  const maxOcupado = Math.max(...ocupacionClubes.map(c => c.cupo_ocupado), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaStat titulo="Alumnos Registrados" valor={stats.totalAlumnos} color="bg-blue-500/10 border-blue-500/20 text-blue-300"
          icono="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        <TarjetaStat titulo="Alumnos Inscritos" valor={stats.alumnosInscritos} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          icono="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <TarjetaStat titulo="Total de Clubes" valor={stats.totalClubes} color="bg-amber-500/10 border-amber-500/20 text-amber-300"
          icono="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        <TarjetaStat titulo="Ocupación General" valor={`${stats.porcentajeOcupacion}%`} color="bg-purple-500/10 border-purple-500/20 text-purple-300"
          icono="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaStat titulo="Postulados" valor={totalPostulados} color="bg-amber-500/10 border-amber-500/20 text-amber-300"
          icono="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <TarjetaStat titulo="Preseleccionados" valor={totalPreseleccionados} color="bg-blue-500/10 border-blue-500/20 text-blue-300"
          icono="M5 13l4 4L19 7" />
        <TarjetaStat titulo="Miembros" valor={totalMiembros} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          icono="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <TarjetaStat titulo="Rechazados" valor={totalRechazados} color="bg-red-500/10 border-red-500/20 text-red-300"
          icono="M6 18L18 6M6 6l12 12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-xl border p-5 ${esOscuro ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-white shadow-sm'}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Cupo Máximo vs Ocupado por Club</h3>
          <div className="space-y-1">
            {ocupacionClubes.length === 0 && <p className="text-sm text-slate-500">Sin datos</p>}
            {ocupacionClubes.map(c => (
              <BarraOcupacion key={c.id_club} nombre={c.nombre_club} maximo={c.cupo_maximo} ocupado={c.cupo_ocupado} maxOcupado={maxOcupado} esOscuro={esOscuro} />
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-5 ${esOscuro ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-white shadow-sm'}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Clubes con Más Integrantes</h3>
          <div className="space-y-2">
            {topClubes.length === 0 && <p className="text-sm text-slate-500">Sin datos</p>}
            {topClubes.map((c, i) => (
              <div key={c.id_club} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${i < 3 ? 'bg-amber-400 text-[#0e162c]' : esOscuro ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                  {i + 1}
                </span>
                <span className="text-sm flex-1 truncate">{c.nombre_club}</span>
                <span className="text-sm font-bold text-amber-400">{c.total_integrantes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-5 ${esOscuro ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-white shadow-sm'}`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Distribución de Solicitudes por Estado</h3>
        {solicitudesArr.length === 0 ? (
          <p className="text-sm text-slate-500">Sin datos</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {solicitudesArr.map(s => {
              const colores = {
                'Postulado': { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300' },
                'En revisión': { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-300' },
                'Preseleccionado': { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-300' },
                'Convocado': { bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-300' },
                'Oferta emitida': { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-300' },
                'Miembro oficial': { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300' },
                'Rechazado': { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-300' },
                'No seleccionado': { bg: 'bg-slate-500/10 border-slate-500/30', text: 'text-slate-300' },
                'Oferta rechazada': { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-300' },
                'Oferta expirada': { bg: 'bg-slate-500/10 border-slate-500/30', text: 'text-slate-300' },
              };
              const c = colores[s.status] || { bg: 'bg-slate-500/10 border-slate-500/30', text: 'text-slate-300' };
              return (
                <div key={s.status} className={`rounded-lg border p-3 text-center ${c.bg}`}>
                  <p className={`text-2xl font-black ${c.text}`}>{s.total}</p>
                  <p className={`text-xs mt-1 ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{s.status}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
