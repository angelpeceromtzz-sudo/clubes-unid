import { useTheme } from '../../../contexts/ThemeContext';
import { AvatarInicial } from '../../ui/AvatarInicial';

export function PreseleccionadosSinBloque({ alumnos, onAsignarBloque }) {
  const { tema, modoOscuro } = useTheme();
  if (alumnos.length === 0) return null;

  return (
    <div className={`rounded-2xl p-5 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <h3 className={`text-base font-black uppercase tracking-wider mb-4 ${tema.title}`}>
        Preseleccionados sin bloque
      </h3>
      <div className="space-y-2">
        {alumnos.map((s) => (
          <div key={s.id_formulario} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
            <AvatarInicial nombre={s.nombre_completo} color="purple" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{s.nombre_completo}</p>
              <p className="text-[10px] text-slate-500 font-mono">{s.matricula}</p>
            </div>
            <select
              onChange={(e) => {
                const bloque = e.target.value;
                if (bloque) onAsignarBloque(s.id_formulario, bloque);
                e.target.value = '';
              }}
              className="bg-[#18223f] border border-slate-600 text-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option value="">Asignar bloque</option>
              <option value="A">Bloque A</option>
              <option value="B">Bloque B</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
