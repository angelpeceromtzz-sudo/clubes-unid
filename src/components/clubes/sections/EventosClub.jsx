import { Icono } from '../../ui/Icono';

export function EventosClub({ modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
    badge: modoOscuro ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-600 border-amber-200",
  };

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
            <Icono nombre="calendar" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Próximos Eventos</h2>
        </div>
        <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${c.badge}`}>
          Próximamente
        </span>
      </div>
      <div className={`rounded-xl border-2 border-dashed p-8 md:p-12 text-center ${modoOscuro ? 'border-slate-700 bg-slate-800/30' : 'border-slate-300 bg-slate-50'}`}>
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${modoOscuro ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
          <Icono nombre="calendar" strokeWidth={1.5} className={`h-8 w-8 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
        </div>
        <p className={`text-sm font-bold mb-1 ${c.title}`}>Eventos del club</p>
        <p className={`text-xs leading-relaxed max-w-md mx-auto ${c.text}`}>
          Próximamente los presidentes podrán publicar eventos del club.
        </p>
      </div>
    </section>
  );
}
