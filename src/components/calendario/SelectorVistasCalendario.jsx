import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

const VISTAS = [
  { valor: 'calendario', etiqueta: 'Calendario', descripcion: 'Fechas y actividades', icono: 'calendar' },
  { valor: 'mural', etiqueta: 'Mural', descripcion: 'Noticias y avisos', icono: 'newspaper' },
];

export function SelectorVistasCalendario({ vista, onChange, calendarioBloqueado = false }) {
  const { tema, modoOscuro } = useTheme();

  function navegar(evento) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const siguiente = evento.key === 'Home' ? 'calendario' : evento.key === 'End' ? 'mural' : vista === 'mural' ? 'calendario' : 'mural';
    onChange(siguiente);
    document.getElementById(`pestana-${siguiente}`)?.focus();
  }

  return (
    <div className={`inline-flex w-full sm:w-auto rounded-xl border p-1 mb-5 ${modoOscuro ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-100/80'}`} role="tablist" aria-label="Calendario y mural">
      {VISTAS.map((opcion) => {
        const activa = vista === opcion.valor;
        const esCalendario = opcion.valor === 'calendario';
        const bloqueada = esCalendario && calendarioBloqueado;
        const descripcion = bloqueada
          ? 'Fechas y actividades (requiere sesión)'
          : opcion.valor === 'mural' && calendarioBloqueado
            ? 'Avisos y publicaciones'
            : opcion.descripcion;
        const colorActivo = esCalendario
          ? modoOscuro ? 'border-amber-400/70 bg-amber-400/5' : 'border-amber-400 bg-amber-50/70'
          : modoOscuro ? 'border-blue-400/70 bg-blue-400/5' : 'border-blue-400 bg-blue-50/70';
        const colorIcono = esCalendario
          ? modoOscuro ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-100 text-amber-800'
          : modoOscuro ? 'bg-blue-400/15 text-blue-300' : 'bg-blue-100 text-blue-700';
        return (
          <button key={opcion.valor} id={`pestana-${opcion.valor}`} type="button" role="tab"
            aria-label={`${opcion.etiqueta}${bloqueada ? ', requiere iniciar sesión' : ''}`} aria-describedby={`descripcion-${opcion.valor}`} aria-selected={activa} aria-controls={`panel-${opcion.valor}`}
            tabIndex={activa ? 0 : -1} onClick={() => onChange(opcion.valor)} onKeyDown={navegar}
            className={`relative flex flex-1 sm:flex-none items-center justify-center gap-2 min-w-0 rounded-lg border px-3 sm:px-5 py-2.5 text-left cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${esCalendario ? 'focus-visible:outline-amber-400' : 'focus-visible:outline-blue-400'} ${activa ? colorActivo : 'border-transparent hover:bg-white/60 dark:hover:bg-slate-800/40'}`}>
            <span aria-hidden="true" className={`inline-flex items-center justify-center shrink-0 h-7 w-7 rounded-md ${activa ? colorIcono : modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}><Icono nombre={opcion.icono} className="h-4 w-4" strokeWidth={1.7} /></span>
            <span className={`text-xs sm:text-sm font-bold ${tema.title}`}>{opcion.etiqueta}</span>
            {bloqueada
              ? <Icono nombre="lock" className={`h-3.5 w-3.5 shrink-0 ${modoOscuro ? 'text-amber-300' : 'text-amber-700'}`} strokeWidth={2.2} />
              : <span aria-hidden="true" className={`hidden sm:block h-1.5 w-1.5 shrink-0 rounded-full ${activa ? esCalendario ? 'bg-amber-400' : 'bg-blue-400' : 'bg-transparent'}`} />}
            <span id={`descripcion-${opcion.valor}`} className="sr-only">{descripcion}</span>
          </button>
        );
      })}
    </div>
  );
}
