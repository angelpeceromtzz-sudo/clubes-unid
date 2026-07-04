import { Icono } from '../../ui/Icono';
import { useTheme } from '../../../contexts/ThemeContext';
import { AvatarInicial } from '../../ui/AvatarInicial';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';

export function PreseleccionadosConBloque({ alumnos, onConvocarTodos, convocando }) {
  const { tema, modoOscuro } = useTheme();
  if (alumnos.length === 0) return null;

  return (
    <div className={`rounded-2xl p-5 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className={`text-base font-black uppercase tracking-wider ${tema.title}`}>
            Preseleccionados con bloque
          </h3>
          <Badge texto={alumnos.length} color="purple" />
        </div>
        <button
          onClick={onConvocarTodos}
          disabled={convocando}
          className="border border-indigo-500/40 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
        >
          {convocando ? (
            <Spinner size="sm" color="border-current" className="!py-0" />
          ) : (
            <Icono nombre="video-camera" className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          Convocar todos
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alumnos.map((s) => (
          <div key={s.id_formulario} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
            <AvatarInicial nombre={s.nombre_completo} color="purple" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{s.nombre_completo}</p>
              <p className="text-[10px] text-slate-500 font-mono">{s.matricula} · Bloque {s.bloque_asignado}</p>
            </div>
            <Badge texto="Preseleccionado" color="purple" />
          </div>
        ))}
      </div>
    </div>
  );
}
