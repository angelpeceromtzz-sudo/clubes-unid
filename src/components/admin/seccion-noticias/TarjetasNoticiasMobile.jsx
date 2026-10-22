import { Icono } from '../../ui/Icono';
import { obtenerUrlImagen } from '../../../utils/imagen';
import { fechaCorta, fechaEventoCorta } from '../../../utils/formato';
import { nombreCategoriaEvento } from '../../../constants/categoriasEvento';
import { BadgeEstadoNoticia } from './BadgeEstadoNoticia';
import { AccionesNoticia } from './AccionesNoticia';

export function TarjetasNoticiasMobile({ noticias, modoOscuro, tdTitle, tdCls, idRol, onEnviarRevision, onAprobar, onRechazar, onOcultar, onEditar, onEliminar }) {
  return (
    <div className="space-y-2 md:hidden">
      {noticias.map((n) => (
        <div key={n.id_noticia} className={`rounded-xl border p-3 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex items-start gap-3 mb-2">
            {n.url_imagen ? (
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-800/30 shrink-0">
                <img src={obtenerUrlImagen(n.url_imagen)} alt={n.titulo} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`w-14 h-10 rounded-lg flex items-center justify-center shrink-0 ${modoOscuro ? 'bg-slate-800/40 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
                <Icono nombre="image" className="h-4 w-4" strokeWidth={1.5} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${tdTitle}`}>{n.titulo}</p>
              {n.categoria === 'evento' && <p className={`text-[10px] mt-0.5 ${tdCls}`}>{nombreCategoriaEvento(n.categoria_evento)} · {n.total_interesados ?? 0} interesados</p>}
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] ${tdCls}`}>{n.categoria === 'evento' && n.fecha_evento ? fechaEventoCorta(n.fecha_evento) : fechaCorta(n.fecha_publicacion)}{n.categoria === 'evento' && n.hora_evento ? ` · ${String(n.hora_evento).slice(0, 5)}` : ''}</span>
                {n.destacada && <span className="text-[10px] uppercase font-bold text-amber-400">Destacada</span>}
              </div>
              {n.categoria === 'evento' && n.lugar_evento && <p className={`text-[10px] mt-1 ${tdCls}`}>📍 {n.lugar_evento}</p>}
            </div>
            <BadgeEstadoNoticia estado={n.status} motivo={n.motivo_rechazo} />
          </div>

          {/* Motivo del rechazo (PBI-17): el autor ve aquí qué corregir. */}
          {n.status === 'rejected' && n.motivo_rechazo && (
            <p className="mb-2 text-[11px] text-red-400 flex items-start gap-1.5">
              <Icono nombre="alert-triangle" strokeWidth={2} className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{n.motivo_rechazo}</span>
            </p>
          )}

          <AccionesNoticia
            noticia={n}
            idRol={idRol}
            onEnviarRevision={onEnviarRevision}
            onAprobar={onAprobar}
            onRechazar={onRechazar}
            onOcultar={onOcultar}
            onEditar={onEditar}
            onEliminar={onEliminar}
          />
        </div>
      ))}
    </div>
  );
}
