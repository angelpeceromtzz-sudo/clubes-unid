import { Icono } from '../../ui/Icono';

export function EventosClub({ modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
          <Icono nombre="calendar" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Próximos Eventos</h2>
      </div>
      <div className={`p-8 text-center rounded-xl ${modoOscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
        <Icono nombre="calendar" strokeWidth={1.5} className={`h-10 w-10 mx-auto mb-3 ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`} />
        <p className={`text-sm font-medium ${c.text}`}>No hay eventos próximos registrados.</p>
      </div>
    </section>
  );
}
