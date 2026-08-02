import { Icono } from '../../ui/Icono';
import { NIVELES, etiquetaParticipacion } from '../../../constants/clubes';

export function ModalidadClub({ club, modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
    badge: modoOscuro ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-600 border-amber-200",
    chip: modoOscuro ? "bg-slate-800/60 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200",
  };

  const niveles = club?.niveles || [];
  const todosNiveles = NIVELES.every((n) => niveles.some((niv) => niv.id_nivel === n.id_nivel));

  return (
    <section className={`rounded-2xl border p-5 md:p-6 ${c.bg}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
            <Icono nombre="users" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <h2 className={`text-sm font-black tracking-tight ${c.title}`}>Modalidad</h2>
        </div>
        <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${c.badge}`}>
          {etiquetaParticipacion(club?.participacion)}
        </span>
      </div>
      <div className={`rounded-xl border border-dashed p-4 md:p-6 ${modoOscuro ? 'border-slate-700 bg-slate-800/30' : 'border-slate-300 bg-slate-50'}`}>
        {niveles.length === 0 ? (
          <p className={`text-xs ${c.text}`}>Aún no se definen los niveles aceptados.</p>
        ) : todosNiveles ? (
          <div className="flex items-center gap-2">
            <Icono nombre="check-circle" strokeWidth={2} className={`h-4 w-4 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
            <p className={`text-sm font-semibold ${c.title}`}>Todos los niveles</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {niveles.map((niv) => (
              <span key={niv.id_nivel} className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${c.chip}`}>
                {NIVELES.find((n) => n.id_nivel === niv.id_nivel)?.etiqueta || niv.nombre_nivel}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
