import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useNoticias } from '../contexts/NoticiasContext';
import { Icono } from '../components/ui/Icono';
import { Spinner } from '../components/ui/Spinner';
import { normalizarCategoriaEvento } from '../constants/categoriasEvento';
import { fechaHoyCampus } from '../utils/fechas';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ESTILOS_CATEGORIA = {
  social: {
    punto: 'bg-indigo-400',
    claro: 'bg-indigo-100 text-indigo-700',
    oscuro: 'bg-indigo-500/20 text-indigo-300',
  },
  deportivo: {
    punto: 'bg-emerald-400',
    claro: 'bg-emerald-100 text-emerald-700',
    oscuro: 'bg-emerald-500/20 text-emerald-300',
  },
  cultural: {
    punto: 'bg-rose-400',
    claro: 'bg-rose-100 text-rose-700',
    oscuro: 'bg-rose-500/20 text-rose-300',
  },
};

function estiloCategoria(valor) {
  return ESTILOS_CATEGORIA[normalizarCategoriaEvento(valor)];
}

function claveLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaEvento(valor) {
  return valor ? String(valor).slice(0, 10) : '';
}

function capitalizarInicial(valor) {
  return valor.charAt(0).toLocaleUpperCase('es-MX') + valor.slice(1);
}

function fechaLegible(clave) {
  return capitalizarInicial(new Date(`${clave}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }));
}

export function PaginaCalendario() {
  const { tema, modoOscuro } = useTheme();
  const { eventos: publicaciones, cargando } = useNoticias();
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date(`${fechaHoyCampus()}T12:00:00`);
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState(fechaHoyCampus);
  const hoyClave = fechaHoyCampus();

  const eventos = useMemo(
    () => publicaciones.filter((noticia) => noticia.fecha_evento),
    [publicaciones]
  );
  const eventosPorDia = useMemo(() => {
    const mapa = Object.create(null);
    for (const evento of eventos) {
      const clave = fechaEvento(evento.fecha_evento);
      if (!mapa[clave]) mapa[clave] = [];
      mapa[clave].push(evento);
    }
    for (const lista of Object.values(mapa)) {
      lista.sort((a, b) => String(a.hora_evento || '').localeCompare(String(b.hora_evento || '')));
    }
    return mapa;
  }, [eventos]);

  const celdas = useMemo(() => {
    const primerDia = (mesVisible.getDay() + 6) % 7;
    const cantidad = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((primerDia + cantidad) / 7) * 7 }, (_, indice) => {
      const numero = indice - primerDia + 1;
      return numero >= 1 && numero <= cantidad
        ? new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numero)
        : null;
    });
  }, [mesVisible]);

  function cambiarMes(delta) {
    setMesVisible((actual) => new Date(actual.getFullYear(), actual.getMonth() + delta, 1));
    setDiaSeleccionado(null);
  }

  function irAHoy() {
    const hoy = new Date(`${fechaHoyCampus()}T12:00:00`);
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setDiaSeleccionado(claveLocal(hoy));
  }

  const seleccionados = diaSeleccionado ? eventosPorDia[diaSeleccionado] || [] : [];
  const tituloMes = capitalizarInicial(mesVisible.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));

  return (
    <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-10 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className={`flex items-center justify-center h-11 w-11 rounded-xl ${modoOscuro ? 'bg-slate-800/60 text-amber-400' : 'bg-amber-50 text-amber-500'}`}>
              <Icono nombre="calendar" className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <h1 className={`text-3xl font-black tracking-tight ${tema.title}`}>Calendario de eventos</h1>
              <p className={`text-sm mt-0.5 ${tema.subtitle}`}>Consulta las actividades publicadas por Clubes UNID.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => cambiarMes(-1)} className={`p-2 rounded-lg cursor-pointer ${tema.btnInactive}`} aria-label="Mes anterior"><Icono nombre="chevron-left" className="h-5 w-5" /></button>
            <button type="button" onClick={irAHoy} className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${tema.btnInactive}`}>Hoy</button>
            <button type="button" onClick={() => cambiarMes(1)} className={`p-2 rounded-lg cursor-pointer ${tema.btnInactive}`} aria-label="Mes siguiente"><Icono nombre="chevron-right" className="h-5 w-5" /></button>
          </div>
        </div>

        {cargando ? <Spinner className="py-20" /> : (
          <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
            <section className={`min-w-0 rounded-2xl border overflow-hidden ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`} aria-label={`Calendario de ${tituloMes}`}>
              <div className={`text-center py-4 border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <h2 className={`text-lg font-black ${tema.title}`}>{tituloMes}</h2>
              </div>
              <div className="grid grid-cols-7">
                {DIAS_SEMANA.map((dia) => <div key={dia} className={`text-center text-[10px] uppercase tracking-widest font-black py-3 ${tema.subtitle}`}>{dia}</div>)}
                {celdas.map((dia, indice) => {
                  const clave = dia ? claveLocal(dia) : `vacio-${indice}`;
                  const eventosDia = dia ? eventosPorDia[clave] || [] : [];
                  return (
                    <button
                      key={clave}
                      type="button"
                      disabled={!dia}
                      onClick={() => dia && setDiaSeleccionado(clave)}
                      aria-label={dia ? `${fechaLegible(clave)}, ${eventosDia.length} evento${eventosDia.length === 1 ? '' : 's'}` : undefined}
                      aria-pressed={dia ? diaSeleccionado === clave : undefined}
                      className={`min-w-0 min-h-20 sm:min-h-28 p-1.5 sm:p-2 text-left border-t border-r ${modoOscuro ? 'border-slate-800/70' : 'border-slate-100'} ${dia ? 'cursor-pointer hover:bg-amber-400/5' : 'cursor-default'} ${diaSeleccionado === clave ? 'bg-amber-400/10' : ''}`}
                    >
                      {dia && <>
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${clave === hoyClave ? 'bg-amber-400 text-slate-950' : tema.title}`}>{dia.getDate()}</span>
                        {eventosDia.length > 0 && <>
                          <span className="flex sm:hidden mt-1 gap-1" aria-hidden="true">
                            {[...new Set(eventosDia.map((evento) => normalizarCategoriaEvento(evento.categoria_evento)))].map((categoria) => (
                              <span key={categoria} className={`w-2 h-2 rounded-full ${estiloCategoria(categoria).punto}`} />
                            ))}
                          </span>
                          <div className="hidden sm:block mt-1 space-y-1">
                            {eventosDia.slice(0, 2).map((evento) => (
                              <div key={evento.id_noticia} className={`truncate rounded px-1.5 py-1 text-[10px] font-bold ${estiloCategoria(evento.categoria_evento)[modoOscuro ? 'oscuro' : 'claro']}`}>{evento.titulo}</div>
                            ))}
                            {eventosDia.length > 2 && <span className={`text-[10px] ${tema.subtitle}`}>+{eventosDia.length - 2} más</span>}
                          </div>
                        </>}
                      </>}
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className={`rounded-2xl border p-5 h-fit ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`} aria-live="polite">
              <h2 className={`font-black ${tema.title}`}>{diaSeleccionado ? fechaLegible(diaSeleccionado) : 'Selecciona un día'}</h2>
              {diaSeleccionado && seleccionados.length === 0 && <p className={`text-sm mt-4 ${tema.subtitle}`}>No hay eventos para este día.</p>}
              <div className="mt-4 space-y-3">
                {seleccionados.map((evento) => <article key={evento.id_noticia} className={`rounded-xl p-3 ${modoOscuro ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <h3 className={`text-sm font-black ${tema.title}`}>{evento.titulo}</h3>
                  {evento.hora_evento && <p className={`text-xs mt-1 ${tema.subtitle}`}>🕒 {String(evento.hora_evento).slice(0, 5)}</p>}
                  {evento.lugar_evento && <p className={`text-xs mt-1 ${tema.subtitle}`}>📍 {evento.lugar_evento}</p>}
                  <p className={`text-xs mt-2 leading-relaxed whitespace-pre-line break-words ${tema.subtitle}`}>{evento.contenido}</p>
                </article>)}
              </div>
              {!diaSeleccionado && <p className={`text-sm mt-4 ${tema.subtitle}`}>Selecciona una fecha para ver sus eventos.</p>}
              <Link to="/eventos" className="inline-block mt-5 text-xs font-bold text-amber-500 hover:text-amber-400">Ver todos los eventos</Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
