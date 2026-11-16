/* Reconocimientos (insignias) del alumno. */
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';

export function SeccionReconocimientos({ reconocimientos = [] }) {
  const { modoOscuro, cardCls } = useTheme();
  const lista = Array.isArray(reconocimientos) ? reconocimientos : [];

  if (lista.length === 0) {
    return (
      <div className={`${cardCls} rounded-2xl border p-6 text-center space-y-3`}>
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${modoOscuro ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
          <Icono nombre="trophy" className="h-6 w-6" />
        </span>
        <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          Aún no tienes reconocimientos. ¡Sigue participando!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {lista.map((r) => (
        <div
          key={r.id_reconocimiento}
          className={`${cardCls} rounded-2xl border p-4 flex flex-col items-center text-center gap-2 relative group`}
          title={r.descripcion || r.codigo}
        >
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${modoOscuro ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
            <Icono nombre="trophy" className="h-6 w-6" />
          </span>
          <p className={`text-xs font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{r.codigo}</p>
          {r.descripcion && (
            <p className={`text-[11px] ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{r.descripcion}</p>
          )}
          {r.noticia_titulo && <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Noticia vinculada: {r.noticia_titulo}</p>}
          {r.id_noticia && (
            <Link
              to="/noticias"
              className={`text-[11px] underline ${modoOscuro ? 'text-amber-300' : 'text-amber-700'}`}
            >
              Abrir noticias
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}