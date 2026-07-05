import { Icono } from '../../ui/Icono';

const faqs = [
  { p: '¿Cómo me inscribo?', r: 'Haz clic en "Inscribirme ahora" y completa el formulario.' },
  { p: '¿Hay costo?', r: 'La mayoría de los clubes son gratuitos para alumnos UNID.' },
  { p: '¿Puedo unirme a varios?', r: 'Sí, siempre que cumplas con los horarios y requisitos.' },
  { p: '¿Hay límite de cupo?', r: 'Sí, cada club tiene un cupo máximo de alumnos.' },
];

export function FAQClub({ modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
          <Icono nombre="help-circle" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Preguntas Frecuentes</h2>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <details key={i} className={`group rounded-xl ${modoOscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <summary className={`flex items-center justify-between p-4 cursor-pointer list-none font-bold text-sm ${c.title}`}>
              {faq.p}
              <Icono nombre="chevron-down" strokeWidth={2} className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className={`px-4 pb-4 text-sm ${c.text}`}>{faq.r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
