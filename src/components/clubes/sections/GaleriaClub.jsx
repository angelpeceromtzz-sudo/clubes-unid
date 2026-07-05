import { Icono } from '../../ui/Icono';

export function GaleriaClub({ modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
          <Icono nombre="image" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Galería</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`aspect-square rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <Icono nombre="image" strokeWidth={1.5} className={`h-8 w-8 ${modoOscuro ? 'text-slate-700' : 'text-slate-300'}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
