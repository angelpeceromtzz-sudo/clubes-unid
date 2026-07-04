/* Muestra la información general de un club: descripción, categoría y horarios. */
import { useTheme } from '../../contexts/ThemeContext';

export function InformacionClub({ club }) {
  const { tema, modoOscuro } = useTheme();
  const esOscuro = modoOscuro;
  const cardCls = esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div className={`${cardCls} rounded-2xl p-6`}>
      <h3 className={`text-lg font-black uppercase tracking-wider mb-4 ${tema.title}`}>
        Información del Club
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Nombre</p>
          <p className={`text-sm font-medium ${tema.title}`}>{club.nombre_club}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Categoría</p>
          <p className={`text-sm font-medium ${tema.title}`}>{club.categoria}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Lugar</p>
          <p className={`text-sm font-medium ${tema.title}`}>{club.lugar || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Cupo</p>
          <p className={`text-sm font-medium ${tema.title}`}>{club.cupo_maximo} lugares</p>
        </div>
      </div>

      {club.horarios && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Horarios</p>
          <div className="space-y-1.5">
            {club.horarios.map((h, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <strong className={tema.title}>{h.dia}:</strong> {h.horario}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
