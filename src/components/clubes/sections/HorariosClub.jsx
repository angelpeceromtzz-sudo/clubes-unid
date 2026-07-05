import { Icono } from '../../ui/Icono';

export function HorariosClub({ horarios, modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  const lista = horarios?.length ? horarios : [
    { dia: 'Lunes', hora_inicio: '16:00', hora_fin: '18:00', lugar: '' },
    { dia: 'Miércoles', hora_inicio: '16:00', hora_fin: '18:00', lugar: '' },
  ];

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
          <Icono nombre="clock" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Horarios</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
              <th className={`text-left py-3 font-bold ${c.title}`}>Día</th>
              <th className={`text-left py-3 font-bold ${c.title}`}>Inicio</th>
              <th className={`text-left py-3 font-bold ${c.title}`}>Fin</th>
              <th className={`text-left py-3 font-bold ${c.title}`}>Lugar</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((h, i) => (
              <tr key={i} className={`border-b ${modoOscuro ? 'border-slate-800/50' : 'border-slate-100'}`}>
                <td className={`py-3 font-medium ${c.text}`}>{h.dia}</td>
                <td className={`py-3 ${c.text}`}>{h.hora_inicio}</td>
                <td className={`py-3 ${c.text}`}>{h.hora_fin}</td>
                <td className={`py-3 ${c.text}`}>{h.lugar || club?.lugar || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
