import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { TimelinePostulacion, CONFIG_ESTATUS } from './TimelinePostulacion';
import { AvatarInicial } from '../ui/AvatarInicial';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';

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

export function TarjetaPostulacionV2({ postulacion, onRespuesta, respondiendo }) {
  const { tema } = useTheme();
  const conf = CONFIG_ESTATUS[postulacion.status] || CONFIG_ESTATUS['Postulado'];
  const esOferta = postulacion.status === 'Oferta enviada';
  const esFinal = ['Miembro oficial', 'Rechazado'].includes(postulacion.status);
  const tiempoRestante = esOferta ? calcularTiempoRestante(postulacion.fecha_expiracion) : null;
  const cargandoRespuesta = respondiendo[postulacion.id_formulario];

  return (
    <div className={`rounded-2xl border overflow-hidden ${tema.isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {postulacion.imagen_portada ? (
              <img src={postulacion.imagen_portada} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
            ) : (
              <AvatarInicial nombre={postulacion.nombre_club} color="amber" size="md" />
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
          <Badge texto={conf.label} size="md" color={
            postulacion.status === 'Postulado' || postulacion.status === 'Pendiente' ? 'yellow' :
            postulacion.status === 'En revisión' ? 'blue' :
            postulacion.status === 'Preseleccionado' ? 'purple' :
            postulacion.status === 'Convocado' ? 'indigo' :
            postulacion.status === 'Oferta enviada' ? 'emerald' :
            postulacion.status === 'Miembro oficial' ? 'amber' :
            postulacion.status === 'Rechazado' ? 'red' : 'slate'
          } />
        </div>

        <div className="flex gap-6">
          <div className="shrink-0">
            <TimelinePostulacion historial={postulacion.historial} statusActual={postulacion.status} />
          </div>

          <div className="flex-1 min-w-0">
            <div className={`rounded-xl p-3 mb-3 ${conf.bg} border ${conf.border}`}>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 ${conf.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={conf.icon} />
                </svg>
                <p className={`text-xs font-medium ${conf.color}`}>{conf.msg}</p>
              </div>
            </div>

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
                      <Spinner size="sm" color="border-black" className="!py-0" />
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
                      <Spinner size="sm" color="border-current" className="!py-0" />
                    ) : (
                      'Rechazar'
                    )}
                  </button>
                </div>
              </div>
            )}

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
