import { Icono } from '../../ui/Icono';

const requisitos = [
  'Ser alumno regular de UNID',
  'Disponibilidad de horario',
  'Ganas de participar y aprender',
  'Respetar las reglas del club',
];

export function RequisitosClub({ modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
          <Icono nombre="alert-triangle" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Requisitos</h2>
      </div>
      <ul className="space-y-3">
        {requisitos.map((req, i) => (
          <li key={i} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${modoOscuro ? 'bg-green-500/20' : 'bg-green-100'}`}>
              <Icono nombre="check" strokeWidth={3} className={`h-3.5 w-3.5 ${modoOscuro ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <span className={`text-sm font-medium ${c.text}`}>{req}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
