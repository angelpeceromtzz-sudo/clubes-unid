import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';

function fechaBonita(fecha) {
  if (!fecha) return '';
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function EventosClub({ modoOscuro, idClub }) {
  const { tema } = useTheme();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const fondo = modoOscuro ? 'bg-[#0e162c] border-slate-800' : 'bg-white border-slate-200';

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    api.getEventosClub(idClub)
      .then((data) => { if (vigente) { setEventos(Array.isArray(data) ? data : []); setErrorCarga(false); } })
      .catch(() => { if (vigente) { setEventos([]); setErrorCarga(true); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [idClub]);

  return (
    <section className={`rounded-2xl border p-5 md:p-6 ${fondo}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
          <Icono nombre="calendar" className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <div>
          <h2 className={`text-sm font-black tracking-tight ${tema.title}`}>Próximos Eventos</h2>
          <p className={`text-[11px] ${tema.subtitle}`}>Actividades organizadas por el club</p>
        </div>
      </div>
      {cargando ? <p className={`py-8 text-center text-xs ${tema.subtitle}`}>Cargando eventos…</p>
        : errorCarga ? (
          <p className={`rounded-xl border border-dashed p-5 text-center text-xs ${modoOscuro ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>No se pudieron cargar los eventos por el momento.</p>
        ) : eventos.length === 0 ? (
          <div className={`rounded-xl border border-dashed p-5 text-center ${modoOscuro ? 'border-slate-700 bg-slate-800/30' : 'border-slate-300 bg-slate-50'}`}>
            <Icono nombre="calendar" className={`mx-auto mb-2 h-5 w-5 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
            <p className={`text-xs ${tema.subtitle}`}>No hay eventos próximos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventos.map((evento) => (
              <article key={evento.id_evento_club} className={`rounded-xl border p-3 ${modoOscuro ? 'border-slate-700 bg-slate-800/35' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className={`text-sm font-bold ${tema.title}`}>{evento.titulo}</h3>
                <div className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] ${tema.subtitle}`}>
                  <span className="inline-flex items-center gap-1"><Icono nombre="calendar" className="h-3.5 w-3.5 text-amber-500" />{fechaBonita(evento.fecha_evento)}{evento.fecha_fin_evento && evento.fecha_fin_evento !== evento.fecha_evento ? ` – ${fechaBonita(evento.fecha_fin_evento)}` : ''}</span>
                  {evento.hora_evento && <span className="inline-flex items-center gap-1"><Icono nombre="clock" className="h-3.5 w-3.5 text-amber-500" />{String(evento.hora_evento).slice(0, 5)}</span>}
                  {evento.lugar_evento && <span className="inline-flex items-center gap-1"><Icono nombre="map-pin" className="h-3.5 w-3.5 text-amber-500" />{evento.lugar_evento}</span>}
                </div>
                <p className={`mt-2 whitespace-pre-line text-xs leading-relaxed ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{evento.descripcion}</p>
              </article>
            ))}
          </div>
        )}
    </section>
  );
}
