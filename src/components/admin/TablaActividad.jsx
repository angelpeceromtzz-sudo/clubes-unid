/* Tabla de actividad de clubes: log de eventos operativos con paginación (solo admin/rectoría). */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';

const EVENTOS_CONFIG = {
  convocatoria_abierta: {
    label: 'Convocatoria Abierta',
    badge: 'bg-emerald-500/15 text-emerald-400',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  convocatoria_cerrada: {
    label: 'Convocatoria Cerrada',
    badge: 'bg-red-500/15 text-red-400',
    icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  },
  anuncio_club: {
    label: 'Anuncio de Club',
    badge: 'bg-blue-500/15 text-blue-400',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
  evento_creado: {
    label: 'Evento Actualizado',
    badge: 'bg-amber-500/15 text-amber-400',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  ofertas_enviadas: {
    label: 'Ofertas Enviadas',
    badge: 'bg-purple-500/15 text-purple-400',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  convocatoria_generada: {
    label: 'Convocatoria Generada',
    badge: 'bg-cyan-500/15 text-cyan-400',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
};

const DEFAULT_EVENTO = {
  label: 'Evento',
  badge: 'bg-slate-500/15 text-slate-400',
  icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

function EventoIcon({ path, className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export function TablaActividad() {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle } = useTheme();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const cargar = useCallback(async (page) => {
    setCargando(true);
    try {
      const data = await api.getActividadClubes(page);
      setEventos(data.eventos);
      setTotalPaginas(data.totalPages);
      setPagina(data.page);
    } catch {
      setEventos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(pagina); }, [pagina, cargar]);

  const configEvento = (tipo) => EVENTOS_CONFIG[tipo] || DEFAULT_EVENTO;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black uppercase tracking-wider">Actividad de Clubes</h2>
        <button
          onClick={() => cargar(pagina)}
          className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="sm" className="!py-0" />
        </div>
      ) : eventos.length === 0 ? (
        <div className={tableBg + ' rounded-2xl py-16 px-4 text-center'}>
          <svg className={'h-10 w-10 mx-auto mb-3 ' + (modoOscuro ? 'text-slate-600' : 'text-slate-300')} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className={'text-sm font-medium ' + (modoOscuro ? 'text-slate-400' : 'text-slate-500')}>
            No hay eventos registrados.
          </p>
        </div>
      ) : (
        <>
          <div className={tableBg + ' rounded-2xl overflow-hidden hidden md:block'}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={'border-b text-left ' + (modoOscuro ? 'border-slate-700/50' : 'border-slate-200')}>
                    <th className={'px-4 py-4 text-[10px] uppercase tracking-wider font-bold ' + thCls}>Fecha</th>
                    <th className={'px-4 py-4 text-[10px] uppercase tracking-wider font-bold ' + thCls}>Tipo</th>
                    <th className={'px-4 py-4 text-[10px] uppercase tracking-wider font-bold ' + thCls}>Club</th>
                    <th className={'px-4 py-4 text-[10px] uppercase tracking-wider font-bold ' + thCls}>Actor</th>
                    <th className={'px-4 py-4 text-[10px] uppercase tracking-wider font-bold ' + thCls}>Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((e) => {
                    const cfg = configEvento(e.tipo_evento);
                    return (
                      <tr key={e.id_evento} className={'border-b transition-colors ' + (modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50')}>
                        <td className={'px-4 py-3 whitespace-nowrap font-mono text-xs ' + tdCls}>
                          {new Date(e.fecha_creacion).toLocaleString('es-MX', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ' + cfg.badge}>
                            <EventoIcon path={cfg.icon} className="h-3 w-3 shrink-0" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className={'px-4 py-3 font-medium ' + tdTitle}>
                          {e.nombre_club || 'Sistema'}
                        </td>
                        <td className={'px-4 py-3 text-xs ' + tdCls}>
                          {e.actor_nombre || '-'}
                        </td>
                        <td className={'px-4 py-3 text-xs ' + tdCls + ' max-w-xs break-words'}>
                          {e.descripcion}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {eventos.map((e) => {
              const cfg = configEvento(e.tipo_evento);
              return (
                <div key={e.id_evento} className={'rounded-xl border p-3 ' + (modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ' + cfg.badge}>
                      <EventoIcon path={cfg.icon} className="h-3 w-3 shrink-0" />
                      {cfg.label}
                    </span>
                    <span className={'text-[10px] font-mono ' + tdCls}>
                      {new Date(e.fecha_creacion).toLocaleString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={'text-sm mb-1 ' + tdTitle}>{e.descripcion}</p>
                  <p className={'text-[11px] ' + tdCls}>
                    <span className={'font-medium ' + (modoOscuro ? 'text-slate-400' : 'text-slate-500')}>Club:</span>{' '}
                    {e.nombre_club || 'Sistema'}
                    {e.actor_nombre && (
                      <>
                        {' \u00B7 '}
                        <span className={'font-medium ' + (modoOscuro ? 'text-slate-400' : 'text-slate-500')}>Actor:</span>{' '}
                        {e.actor_nombre}
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className={'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ' +
                  (modoOscuro ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                Anterior
              </button>
              <span className={'text-xs font-medium ' + (modoOscuro ? 'text-slate-400' : 'text-slate-500')}>
                Pagina {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className={'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ' +
                  (modoOscuro ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
