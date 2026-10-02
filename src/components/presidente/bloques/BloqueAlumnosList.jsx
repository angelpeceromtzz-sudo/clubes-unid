import { useTheme } from '../../../contexts/ThemeContext';

export function BloqueAlumnosList({ alumnos }) {
  const { modoOscuro } = useTheme();
  if (!alumnos || alumnos.length === 0) return null;
  return (
    <div className={`border-t px-5 py-3 ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
      <p className={`text-[10px] uppercase tracking-wider font-bold mb-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
        Alumnos
      </p>
      <div className="space-y-1.5">
        {alumnos.map((a) => (
          <div key={a.id_formulario} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-600/30 flex items-center justify-center text-slate-300 font-bold text-[9px] shrink-0">
              {a.nombre_completo.charAt(0)}
            </div>
            <p className={`text-xs truncate ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{a.nombre_completo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
