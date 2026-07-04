import { Icono } from '../ui/Icono';

export const CONFIG_ESTATUS = {
  'Pendiente':        { color: 'text-yellow-400',  bg: 'bg-yellow-500/20',  border: 'border-yellow-500/30', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                msg: 'Formulario enviado',                  label: 'Postulado' },
  'Postulado':        { color: 'text-yellow-400',  bg: 'bg-yellow-500/20',  border: 'border-yellow-500/30', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                msg: 'Formulario enviado',                  label: 'Postulado' },
  'En revisión':      { color: 'text-blue-400',    bg: 'bg-blue-500/20',    border: 'border-blue-500/30',   icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', msg: 'El presidente revisará tu formulario',         label: 'En revisión' },
  'Preseleccionado':  { color: 'text-purple-400',  bg: 'bg-purple-500/20',  border: 'border-purple-500/30',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',                msg: '¡Pasaste a la siguiente etapa!',       label: 'Preseleccionado' },
  'Convocado':        { color: 'text-indigo-400',  bg: 'bg-indigo-500/20',  border: 'border-indigo-500/30',  icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', msg: 'Revisa los detalles de tu convocatoria', label: 'Convocado' },
  'Oferta enviada':   { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',                msg: '¡Oferta de ingreso!',                  label: 'Oferta de ingreso' },
  'Miembro oficial':  { color: 'text-amber-400',   bg: 'bg-amber-500/20',   border: 'border-amber-500/30',   icon: 'M5 13l4 4L19 7',                                                      msg: '🎉 Eres miembro oficial del club',       label: 'Miembro oficial' },
  'Rechazado':        { color: 'text-red-400',     bg: 'bg-red-500/20',     border: 'border-red-500/30',     icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', msg: 'Tu solicitud no fue aceptada',          label: 'Rechazado' },
};

const ORDEN_TIMELINE = [
  'Postulado', 'En revisión', 'Preseleccionado', 'Convocado',
  'Oferta enviada', 'Miembro oficial',
];

export function TimelinePostulacion({ historial, statusActual }) {
  const pasos = ORDEN_TIMELINE;
  const idxActual = pasos.indexOf(statusActual);

  return (
    <div className="space-y-1">
      {pasos.map((paso, i) => {
        const conf = CONFIG_ESTATUS[paso];
        const pasoHistorial = historial?.find((h) => h.status_nuevo === paso);
        const completado = i <= idxActual;
        const esActual = paso === statusActual;
        const lineaArriba = i > 0;
        const lineaAbajo = i < pasos.length - 1;

        if (!completado && paso === 'Miembro oficial') return null;

        return (
          <div key={paso} className="flex items-start gap-3">
            <div className="flex flex-col items-center shrink-0">
              {lineaArriba && (
                <div className={`w-0.5 h-2 ${completado ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
              )}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                esActual
                  ? conf.bg + ' border-2 ' + conf.border
                  : completado
                    ? 'bg-emerald-500/30 border border-emerald-500/50'
                    : 'bg-slate-800 border border-slate-700'
              }`}>
                {completado && paso !== 'Oferta emitida' && paso !== 'Miembro oficial' && (
                  <Icono nombre="check" strokeWidth={3} className="h-2.5 w-2.5 text-emerald-400" />
                )}
                {esActual && paso === 'Oferta enviada' && (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {esActual && paso === 'Miembro oficial' && (
                  <span className="text-xs">🎉</span>
                )}
              </div>
              {lineaAbajo && (
                <div className={`w-0.5 flex-1 min-h-[8px] ${completado && paso !== 'Miembro oficial' ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
              )}
            </div>
            <div className={`pb-2 ${esActual ? '' : 'opacity-50'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${completado ? conf.color : 'text-slate-600'}`}>
                {conf.label}
              </p>
              {pasoHistorial && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {new Date(pasoHistorial.fecha_cambio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
