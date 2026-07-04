import { useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { Icono } from './ui/Icono';

const CONFIG_ESTATUS = {
  'Pendiente':        { color: 'text-yellow-400',  bg: 'bg-yellow-500/20',  border: 'border-yellow-500/30', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                msg: 'Formulario enviado',                  label: 'Postulado' },
  'Postulado':        { color: 'text-yellow-400',  bg: 'bg-yellow-500/20',  border: 'border-yellow-500/30', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                msg: 'Formulario enviado',                  label: 'Postulado' },
  'En revisión':      { color: 'text-blue-400',    bg: 'bg-blue-500/20',    border: 'border-blue-500/30',   icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', msg: 'El presidente está revisando',         label: 'En revisión' },
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

function Timeline({ historial, statusActual }) {
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

function calcularTiempoRestante(fechaExpiracion) {
  if (!fechaExpiracion) return null;
  const ahora = new Date();
  const exp = new Date(fechaExpiracion);
  const diff = exp - ahora;
  if (diff <= 0) return 'Expirada';

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (dias > 0) return `${dias} día${dias !== 1 ? 's' : ''}`;
  if (horas > 0) return `${horas} hora${horas !== 1 ? 's' : ''}`;
  return 'Menos de 1 hora';
}

function TarjetaPostulacionV2({ postulacion, onRespuesta, respondiendo }) {
  const { tema } = useTheme();
  const conf = CONFIG_ESTATUS[postulacion.status] || CONFIG_ESTATUS['Postulado'];
  const esOferta = postulacion.status === 'Oferta enviada';
  const esFinal = ['Miembro oficial', 'Rechazado'].includes(postulacion.status);
  const tiempoRestante = esOferta ? calcularTiempoRestante(postulacion.fecha_expiracion) : null;
  const cargandoRespuesta = respondiendo[postulacion.id_formulario];

  return (
    <div className={`rounded-2xl border overflow-hidden ${tema.isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {postulacion.imagen_portada ? (
              <img src={postulacion.imagen_portada} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <span className="text-amber-400 font-bold text-sm">{postulacion.nombre_club?.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className={`text-base font-bold truncate ${tema.isDark ? 'text-white' : 'text-slate-900'}`}>
                {postulacion.nombre_club}
              </h3>
              <p className="text-xs text-slate-500">
                {postulacion.categoria} · {new Date(postulacion.fecha_envio).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${conf.bg} ${conf.color} ${conf.border}`}>
            {conf.label}
          </span>
        </div>

        <div className="flex gap-6">
          {/* Timeline */}
          <div className="shrink-0">
            <Timeline historial={postulacion.historial} statusActual={postulacion.status} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Estado actual banner */}
            <div className={`rounded-xl p-3 mb-3 ${conf.bg} border ${conf.border}`}>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 ${conf.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={conf.icon} />
                </svg>
                <p className={`text-xs font-medium ${conf.color}`}>{conf.msg}</p>
              </div>
            </div>

            {/* Convocatoria details */}
            {postulacion.convocatoria && (
              <div className={`rounded-xl p-3 mb-3 ${tema.isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
                <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Evaluación programada
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>
                      {new Date(postulacion.convocatoria.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>{postulacion.convocatoria.hora}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>{postulacion.convocatoria.lugar}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Oferta: accept/reject + expiration */}
            {esOferta && (
              <div className="space-y-3">
                <div className={`rounded-xl p-3 border ${tema.isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className={`text-xs font-semibold ${tema.isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    ¡Felicidades! Has sido seleccionado para formar parte de este club.
                  </p>
                  {postulacion.fecha_expiracion && (
                    <p className={`text-xs mt-1.5 ${tiempoRestante === 'Expirada' ? 'text-red-400' : tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      ⏳ Tienes hasta el {new Date(postulacion.fecha_expiracion).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} a las {new Date(postulacion.fecha_expiracion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs para responder
                      {tiempoRestante && tiempoRestante !== 'Expirada' && (
                        <span className="block mt-0.5 font-bold text-emerald-400">({tiempoRestante} restantes)</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRespuesta(postulacion.id_formulario, 'aceptar')}
                    disabled={cargandoRespuesta}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cargandoRespuesta === 'aceptar' ? (
                      <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Icono nombre="check" strokeWidth={2.5} className="h-4 w-4" />
                        Aceptar oferta
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onRespuesta(postulacion.id_formulario, 'rechazar')}
                    disabled={cargandoRespuesta}
                    className={`flex-1 border rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                      tema.isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cargandoRespuesta === 'rechazar' ? (
                      <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mx-auto" />
                    ) : (
                      'Rechazar'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Miembro oficial banner */}
            {postulacion.status === 'Miembro oficial' && (
              <div className={`rounded-xl p-4 border ${tema.isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'} text-center`}>
                <p className="text-2xl mb-1">🎉</p>
                <p className={`text-sm font-bold ${tema.isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  Bienvenido al club
                </p>
                <p className={`text-xs mt-1 ${tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Ya eres parte de {postulacion.nombre_club}
                </p>
              </div>
            )}

            {/* Terminal states info */}
            {esFinal && postulacion.status !== 'Miembro oficial' && (
              <p className={`text-xs ${tema.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {postulacion.fecha_respuesta && (
                  <>Respondiste el {new Date(postulacion.fecha_respuesta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SeccionPostulaciones({ postulaciones, onPostulacionesChange }) {
  const { tema } = useTheme();
  const [respondiendo, setRespondiendo] = useState({});

  async function manejarRespuesta(id, decision) {
    setRespondiendo((prev) => ({ ...prev, [id]: decision }));
    try {
      await api.responderOferta(id, decision);
      if (onPostulacionesChange) onPostulacionesChange();
    } catch (err) {
      alert(err.message);
    } finally {
      setRespondiendo((prev) => ({ ...prev, [id]: null }));
    }
  }

  if (!postulaciones || postulaciones.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>
            Mis Postulaciones
          </h2>
          <p className={`text-sm mt-0.5 ${tema.subtitle}`}>
            {postulaciones.length} de 3 postulaciones utilizadas
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {postulaciones.map((p, i) => {
          const cardKey = p.id_formulario ?? `idx-${i}`;
          return (
            <TarjetaPostulacionV2
              key={cardKey}
              postulacion={p}
              onRespuesta={manejarRespuesta}
              respondiendo={respondiendo}
            />
          );
        })}
      </div>
    </div>
  );
}
