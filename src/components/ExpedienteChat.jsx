import { Award, CalendarDays, ChevronDown, GraduationCap, Mail, MapPin, Phone, ShieldCheck, Users, UserRound, Sparkles } from 'lucide-react';

const fecha = valor => valor ? String(valor).slice(0, 10) : null;
const titulo = rol => rol?.replaceAll('_', ' ') || 'usuario';
const iniciales = nombre => nombre?.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]?.toUpperCase()).join('') || 'U';

function Dato({ icono: Icono, etiqueta, valor }) {
  if (valor == null || valor === '') return null;
  return <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-amber-400/10 dark:bg-[#18223f]">
    <Icono size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{etiqueta}</p><p className="break-words text-xs font-medium text-[#0e162c] dark:text-white">{valor}</p></div>
  </div>;
}

function Medida({ numero, etiqueta }) {
  return <div className="min-w-0 rounded-xl border border-amber-400/25 bg-amber-50 px-2 py-2.5 text-center dark:bg-amber-400/10">
    <p className="text-xl font-black tabular-nums text-[#0e162c] dark:text-amber-300">{numero}</p>
    <p className="text-[10px] font-medium leading-tight text-slate-600 dark:text-slate-300">{etiqueta}</p>
  </div>;
}

function Historial({ icono: Icono, titulo: nombre, registros, renderizar }) {
  if (!registros?.length) return null;
  return <details className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-amber-400/10 dark:bg-[#18223f]">
    <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-700 dark:text-amber-300"><Icono size={15} aria-hidden="true" /></span>
      <span className="flex-1 text-xs font-bold text-[#0e162c] dark:text-white">{nombre}</span>
      <span className="rounded-full bg-[#0e162c]/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">{registros.length}</span>
      <ChevronDown size={14} className="text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400" aria-hidden="true" />
    </summary>
    <div className="max-h-52 space-y-0.5 overflow-y-auto border-t border-slate-200 px-3 py-2 dark:border-white/10">
      {registros.map((registro, indice) => <div key={indice} className="border-l border-amber-500/60 py-1.5 pl-3 text-xs leading-relaxed text-slate-700 dark:text-slate-200">{renderizar(registro)}</div>)}
    </div>
  </details>;
}

export function ExpedienteChat({ ficha }) {
  const datos = ficha.expediente;
  const perfil = datos?.perfil;
  const clubActivo = datos?.inscripciones?.find(item => item.estatus === 'activo')?.nombre_club;
  const asistencias = datos?.asistencia?.filter(item => item.estado === 'presente').length || 0;
  return <article aria-label={`Expediente de ${ficha.nombre}`} className="mt-3 overflow-hidden rounded-2xl border border-amber-400/40 bg-white text-[#0e162c] shadow-[0_18px_50px_rgba(3,7,18,.18)] dark:bg-[#0e162c] dark:text-white">
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,.22),transparent_45%),linear-gradient(135deg,#15284b,#0e162c_70%)] px-4 pb-4 pt-5">
      <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full border border-amber-300/20" aria-hidden="true" />
      <div className="absolute -right-1 -top-2 h-20 w-20 rounded-full border border-amber-300/15" aria-hidden="true" />
      <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300"><Sparkles size={12} aria-hidden="true" /> Expediente UNID</p>
      <div className="relative flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/15 text-lg font-black tracking-tight text-amber-200 shadow-inner">{iniciales(ficha.nombre)}</div>
        <div className="min-w-0"><h3 className="text-base font-black leading-tight text-white">{ficha.nombre}</h3><div className="mt-1 flex flex-wrap gap-1.5"><span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black capitalize text-slate-950">{titulo(ficha.rol)}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ficha.cuenta_activa ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-400/15 text-slate-300'}`}>{ficha.cuenta_activa ? 'Cuenta activa' : 'Cuenta desactivada'}</span></div></div>
      </div>
      {clubActivo && <p className="relative mt-4 flex items-center gap-1.5 text-xs text-slate-200"><MapPin size={13} className="text-amber-300" aria-hidden="true" /> Club actual: <strong className="font-semibold text-white">{clubActivo}</strong></p>}
    </div>
    <div className="space-y-3 p-3">
      {datos && <div className="grid grid-cols-3 gap-1.5">
        <Medida numero={datos.inscripciones?.length || 0} etiqueta="Inscripciones" />
        <Medida numero={asistencias} etiqueta="Asistencias" />
        <Medida numero={datos.actividades?.length || 0} etiqueta="Actividades" />
      </div>}
      <div className="grid gap-1.5 sm:grid-cols-2">
        <Dato icono={Mail} etiqueta="Correo" valor={ficha.correo} />
        <Dato icono={GraduationCap} etiqueta="Matrícula" valor={perfil?.matricula} />
        <Dato icono={GraduationCap} etiqueta="Carrera" valor={perfil?.licenciatura} />
        <Dato icono={UserRound} etiqueta="Cuatrimestre" valor={perfil?.cuatrimestre} />
        <Dato icono={Phone} etiqueta="Teléfono" valor={perfil?.telefono_celular || perfil?.telefono_contacto} />
        <Dato icono={CalendarDays} etiqueta="Nacimiento" valor={fecha(perfil?.fecha_nacimiento)} />
      </div>
      {datos && <div className="space-y-1.5">
        <Historial icono={Users} titulo="Clubes" registros={datos.inscripciones} renderizar={r => <><strong>{r.nombre_club}</strong> · {r.estatus} · {fecha(r.fecha_inscripcion)}</>} />
        <Historial icono={ShieldCheck} titulo="Postulaciones" registros={datos.postulaciones} renderizar={r => <><strong>{r.nombre_club}</strong> · {r.status} · {fecha(r.fecha_envio)}</>} />
        <Historial icono={CalendarDays} titulo="Asistencia a clubes" registros={datos.asistencia} renderizar={r => <><strong>{r.nombre_club}</strong> · {fecha(r.fecha)} · {r.estado}</>} />
        <Historial icono={MapPin} titulo="Actividades" registros={datos.actividades} renderizar={r => <><strong>{r.actividad}</strong> · {r.edicion} · {r.estado_registro}{r.asistencia ? ` · Asistencia: ${r.asistencia}` : ''}</>} />
        <Historial icono={Award} titulo="Reconocimientos" registros={datos.reconocimientos} renderizar={r => <><strong>{r.actividad}</strong> · {r.edicion} · {r.anio}</>} />
      </div>}
      <Historial icono={Users} titulo="Clubes a cargo" registros={ficha.clubes_a_cargo} renderizar={r => <><strong>{r.nombre_club}</strong> · {r.relacion}</>} />
      <p className="px-1 text-[10px] text-slate-500 dark:text-slate-400">Consulta de solo lectura · Datos actuales del sistema</p>
    </div>
  </article>;
}
