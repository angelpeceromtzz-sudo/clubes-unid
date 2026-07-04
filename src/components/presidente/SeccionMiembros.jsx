import { useTheme } from '../../contexts/ThemeContext';
import { AvatarInicial } from '../ui/AvatarInicial';

export function SeccionMiembros({ miembros, club }) {
  const { tema, modoOscuro } = useTheme();
  const esOscuro = modoOscuro;
  const cardCls = esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div>
      <h3 className={`text-lg font-black uppercase tracking-wider mb-5 ${tema.title}`}>
        Miembros del Club ({miembros.length})
      </h3>
      <div className="space-y-2">
        {miembros.map((m) => (
          <div key={m.id_usuario || m.id} className={`${cardCls} rounded-xl px-5 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <AvatarInicial nombre={m.nombre_completo} color="amber" />
              <div>
                <p className={`text-sm font-medium ${tema.title}`}>
                  {m.nombre_completo}
                  {club.id_presidente === (m.id_usuario || m.id) && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 font-bold">Presidente</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{m.correo_institucional}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
