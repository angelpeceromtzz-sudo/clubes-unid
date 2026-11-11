import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

const SECCIONES = [
  {
    titulo: 'Postulaciones',
    preguntas: [
      {
        p: '¿Cómo me postulo a un club?',
        r: 'Entra al catálogo de clubes, elige uno con convocatoria abierta y pulsa «Inscribirme ahora». Si aún no has iniciado sesión, te pedirá hacerlo con tu correo institucional. Después completa el formulario de inscripción y envíalo.',
      },
      {
        p: '¿Qué datos pide el formulario?',
        r: 'Nombre completo, matrícula, licenciatura, cuatrimestre, teléfono de contacto, motivo para unirte y, opcionalmente, experiencia previa. Revísalo antes de enviarlo.',
      },
      {
        p: '¿Cuántos clubes puedo solicitar?',
        r: 'Puedes tener hasta 3 postulaciones en proceso al mismo tiempo. Si ya tienes 3, el sistema no te dejará postularte a otro hasta que recibas una respuesta.',
      },
      {
        p: '¿Por qué no puedo postularme a un club?',
        r: 'Puede deberse a que: la convocatoria está cerrada, el cupo está lleno, la convocatoria todavía no abre (en ese caso verás la fecha de apertura), ya enviaste una solicitud a ese club, ya tienes 3 postulaciones en proceso o ya eres miembro activo de un club. Cada club tiene un cupo máximo.',
      },
      {
        p: '¿Puedo pertenecer a más de un club?',
        r: 'No. Solo puedes ser miembro de un club, aunque puedes postularte a hasta 3 al mismo tiempo.',
      },
    ],
  },
  {
    titulo: 'Seguimiento',
    preguntas: [
      {
        p: '¿Cómo sé el estado de mi postulación?',
        r: 'En tu panel, en la sección «Mis Postulaciones», puedes ver el avance de cada solicitud.',
      },
      {
        p: '¿Qué significan los estados?',
        r: 'Postulado: formulario enviado. En revisión: el presidente del club revisa tu formulario. Preseleccionado: pasaste a la siguiente etapa. Convocado: revisa los detalles de tu convocatoria. Oferta de ingreso: recibiste una oferta del club. Miembro oficial: ya formas parte del club. Rechazado: tu solicitud no fue aceptada.',
      },
    ],
  },
  {
    titulo: 'Cuenta y acceso',
    preguntas: [
      {
        p: '¿Cómo inicio sesión?',
        r: 'Usa tu correo institucional, que debe terminar en @red.unid.mx o @unid.mx. Pulsa «Iniciar Sesión» en el menú.',
      },
      {
        p: '¿Hay costo por participar en los clubes?',
        r: 'La mayoria son gratuitos, en detalles del club te informarán de cualquier costo asociado.',
      },
      {
        p: '¿Hay límite de cupo?',
        r: 'Sí. Cada club tiene un cupo máximo de alumnos, y cuando se llena deja de aceptar solicitudes.',
      },
    ],
  },
];

export default function PaginaPreguntasFrecuentes() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  const textoSuave = oscuro ? 'text-slate-300' : 'text-slate-600';
  const tarjetaCls = oscuro ? 'bg-[#0e162c] border-slate-800' : 'bg-white border-slate-200';
  const filaCls = oscuro ? 'bg-slate-800/50' : 'bg-slate-50';

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}>
      <BarraGeneral />
      <section className="max-w-3xl mx-auto px-6 sm:px-8 py-12 sm:py-16 space-y-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Preguntas frecuentes</h1>
          <p className={`mt-2 leading-relaxed ${textoSuave}`}>
            Respuestas sobre cómo postularte a un club, dar seguimiento a tu solicitud y usar Clubs UNID.
          </p>
        </div>

        {SECCIONES.map((seccion) => (
          <div key={seccion.titulo} className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-amber-500">{seccion.titulo}</h2>
            <div className={`rounded-2xl border p-3 space-y-2 ${tarjetaCls}`}>
              {seccion.preguntas.map((faq) => (
                <details key={faq.p} className={`group rounded-xl ${filaCls}`}>
                  <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer list-none font-bold text-sm">
                    {faq.p}
                    <span aria-hidden="true" className="text-amber-500 transition-transform duration-200 group-open:rotate-45 text-lg leading-none">+</span>
                  </summary>
                  <p className={`px-4 pb-4 text-sm leading-relaxed ${textoSuave}`}>{faq.r}</p>
                </details>
              ))}
            </div>
          </div>
        ))}

        <div className={`rounded-2xl border p-5 text-sm ${tarjetaCls} ${textoSuave}`}>
          ¿No encontraste tu respuesta?{' '}
          <Link to="/reportar-problemas" className="font-bold text-amber-500 hover:text-amber-400 underline underline-offset-4">
            Reporta un problema o envía tu duda
          </Link>
          .
        </div>
      </section>
      <PiePagina />
    </main>
  );
}
