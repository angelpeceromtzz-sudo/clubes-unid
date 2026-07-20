import { useTheme } from '../../contexts/ThemeContext';
import { TimelinePostulacion, CONFIG_ESTATUS } from './TimelinePostulacion';
import { AvatarInicial } from '../ui/AvatarInicial';
import { Badge } from '../ui/Badge';
import { calcularTiempoRestante } from '../../utils/fechas';
import { InfoConvocatoria } from './InfoConvocatoria';
import { OfertaCard } from './OfertaCard';
import { BienvenidoCard } from './BienvenidoCard';

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
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {postulacion.imagen_portada ? (
              <img src={postulacion.imagen_portada} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
            ) : (
              <AvatarInicial nombre={postulacion.nombre_club} color="amber" size="md" />
            )}
            <div className="min-w-0">
              <h3 className={`text-sm sm:text-base font-bold ${tema.isDark ? 'text-white' : 'text-slate-900'}`}>
                {postulacion.nombre_club}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
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

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="shrink-0">
            <TimelinePostulacion historial={postulacion.historial} statusActual={postulacion.status} />
          </div>

          <div className="flex-1 min-w-0">
            <div className={`rounded-xl p-3 mb-3 ${conf.bg} border ${conf.border}`}>
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 mt-0.5 ${conf.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={conf.icon} />
                </svg>
                <p className={`text-xs sm:text-sm font-medium leading-relaxed ${conf.color}`}>{conf.msg}</p>
              </div>
            </div>

            <InfoConvocatoria convocatoria={postulacion.convocatoria} tema={tema} />

            {esOferta && (
              <OfertaCard
                postulacion={postulacion}
                tiempoRestante={tiempoRestante}
                cargandoRespuesta={cargandoRespuesta}
                tema={tema}
                onRespuesta={onRespuesta}
              />
            )}

            {postulacion.status === 'Miembro oficial' && (
              <BienvenidoCard tema={tema} nombreClub={postulacion.nombre_club} />
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
