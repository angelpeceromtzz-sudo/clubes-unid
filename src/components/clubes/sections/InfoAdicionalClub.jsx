import { Icono } from '../../ui/Icono';

export function InfoAdicionalClub({ club, modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  const cupoActual = parseInt(club.cupo_actual) || 0;

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
          <Icono nombre="info" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Información Adicional</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${modoOscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <p className={`text-xs font-medium ${c.text}`}>Cupo máximo</p>
          <p className={`text-2xl font-black ${c.title}`}>{club.cupo_maximo}</p>
        </div>
        <div className={`p-4 rounded-xl ${modoOscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <p className={`text-xs font-medium ${c.text}`}>Registrados</p>
          <p className={`text-2xl font-black ${c.title}`}>{cupoActual}</p>
        </div>
        <div className={`p-4 rounded-xl ${modoOscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <p className={`text-xs font-medium ${c.text}`}>Disponibles</p>
          <p className={`text-2xl font-black ${c.title}`}>{club.cupo_maximo - cupoActual}</p>
        </div>
        <div className={`p-4 rounded-xl ${modoOscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <p className={`text-xs font-medium ${c.text}`}>Categoría</p>
          <p className={`text-2xl font-black ${c.title}`}>{club.categoria || 'General'}</p>
        </div>
      </div>
    </section>
  );
}
