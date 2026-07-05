import { Icono } from '../../ui/Icono';

const habilidades = [
  'Trabajo en equipo y liderazgo',
  'Gestión de proyectos',
  'Comunicación efectiva',
  'Resolución de problemas',
  'Pensamiento crítico',
  'Creatividad e innovación',
];

export function AprendizajeClub({ modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
          <Icono nombre="zap" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${c.title}`}>¿Qué aprenderás?</h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {habilidades.map((hab, i) => (
          <li key={i} className={`flex items-center gap-3 p-3 rounded-xl ${modoOscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <div className={`w-2 h-2 rounded-full ${modoOscuro ? 'bg-amber-400' : 'bg-amber-500'}`} />
            <span className={`text-sm font-medium ${c.text}`}>{hab}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
