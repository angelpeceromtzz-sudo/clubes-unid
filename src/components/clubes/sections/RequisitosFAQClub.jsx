import { Fragment } from 'react';
import { Icono } from '../../ui/Icono';

const requisitos = [
  'Ser alumno regular de UNID',
  'Disponibilidad de horario',
  'Ganas de participar y aprender',
  'Respetar las reglas del club',
];

const faqs = [
  { p: '¿Cómo me inscribo?', r: 'Haz clic en "Inscribirme ahora" y completa el formulario.' },
  { p: '¿Hay costo?', r: 'Los clubes son gratuitos para alumnos UNID.' },
  { p: '¿Puedo unirme a varios?', r: 'No, solo podras ser miembro de un club, pero podras postularte hasta a 3.' },
  { p: '¿Hay límite de cupo?', r: 'Sí, cada club tiene un cupo máximo de alumnos.' },
];

export function RequisitosFAQClub({ modoOscuro }) {
  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-800" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  return (
    <>
      {/* ── Mobile: 2 tarjetas independientes ── */}
      <div className="flex flex-col gap-6 md:hidden">
        <section className={`rounded-2xl border p-6 ${c.bg}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
              <Icono nombre="alert-triangle" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Requisitos</h2>
          </div>
          <div className="flex flex-col gap-2">
            {requisitos.map((req, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${modoOscuro ? 'bg-green-500/20' : 'bg-green-100'}`}>
                  <Icono nombre="check" strokeWidth={3} className={`h-3.5 w-3.5 ${modoOscuro ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <span className={`text-sm font-medium ${c.text}`}>{req}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`rounded-2xl border p-6 ${c.bg}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
              <Icono nombre="help-circle" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Preguntas Frecuentes</h2>
          </div>
          <div className="flex flex-col gap-2">
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
      </div>

      {/* ── Desktop: 1 tarjeta con grid 2 columnas ── */}
      <section className={`rounded-2xl border p-8 hidden md:block ${c.bg}`}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
              <Icono nombre="alert-triangle" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Requisitos</h2>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
              <Icono nombre="help-circle" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Preguntas Frecuentes</h2>
          </div>

          {requisitos.map((req, i) => (
            <Fragment key={i}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${modoOscuro ? 'bg-green-500/20' : 'bg-green-100'}`}>
                  <Icono nombre="check" strokeWidth={3} className={`h-3.5 w-3.5 ${modoOscuro ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <span className={`text-sm font-medium ${c.text}`}>{req}</span>
              </div>
              <details className={`group rounded-xl ${modoOscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <summary className={`flex items-center justify-between p-4 cursor-pointer list-none font-bold text-sm ${c.title}`}>
                  {faqs[i].p}
                  <Icono nombre="chevron-down" strokeWidth={2} className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className={`px-4 pb-4 text-sm ${c.text}`}>{faqs[i].r}</p>
              </details>
            </Fragment>
          ))}
        </div>
      </section>
    </>
  );
}
