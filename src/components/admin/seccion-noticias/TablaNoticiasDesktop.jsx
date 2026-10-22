import { Icono } from '../../ui/Icono';
import { obtenerUrlImagen } from '../../../utils/imagen';
import { fechaCorta, fechaEventoCorta } from '../../../utils/formato';
import { nombreCategoriaEvento } from '../../../constants/categoriasEvento';
import { BadgeEstadoNoticia } from './BadgeEstadoNoticia';
import { AccionesNoticia } from './AccionesNoticia';

export function TablaNoticiasDesktop({ noticias, modoOscuro, tableBg, thCls, tdCls, tdTitle, idRol, onEnviarRevision, onAprobar, onRechazar, onOcultar, onEditar, onEliminar }) {
  return (
    <div className={`${tableBg} rounded-2xl overflow-hidden hidden md:block`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Imagen</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Noticia</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Fecha</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Estado</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {noticias.map((n) => (
              <tr key={n.id_noticia} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{n.id_noticia}</td>
                <td className="px-5 py-4">
                  {n.url_imagen ? (
                    <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800/30">
                      <img src={obtenerUrlImagen(n.url_imagen)} alt={n.titulo} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-16 h-10 rounded-lg flex items-center justify-center ${modoOscuro ? 'bg-slate-800/40 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
                      <Icono nombre="image" className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  <p className={`font-medium ${tdTitle}`}>{n.titulo}</p>
                  {n.categoria === 'evento' && <p className={`mt-1 text-xs ${tdCls}`}>{nombreCategoriaEvento(n.categoria_evento)} · {n.total_interesados ?? 0} interesados</p>}
                  {n.categoria === 'evento' && n.lugar_evento && <p className={`mt-1 text-xs ${tdCls}`}>📍 {n.lugar_evento}</p>}
                  {/* Motivo del rechazo (PBI-17): para que el autor sepa qué corregir. */}
                  {n.status === 'rejected' && n.motivo_rechazo && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-start gap-1.5" title="Motivo del rechazo">
                      <Icono nombre="alert-triangle" strokeWidth={2} className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{n.motivo_rechazo}</span>
                    </p>
                  )}
                  {n.status === 'pending' && (
                    <p className={`mt-1.5 text-xs ${tdCls}`}>En revisión de rectoría</p>
                  )}
                  {n.destacada && (
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold text-amber-400">Destacada</span>
                  )}
                </td>
                <td className={`px-5 py-4 ${tdCls}`}>
                  {n.categoria === 'evento' && n.fecha_evento ? fechaEventoCorta(n.fecha_evento) : fechaCorta(n.fecha_publicacion)}
                  {n.categoria === 'evento' && n.hora_evento && <span className="block text-xs">{String(n.hora_evento).slice(0, 5)}</span>}
                </td>
                <td className="px-5 py-4">
                  <BadgeEstadoNoticia estado={n.status} motivo={n.motivo_rechazo} size="md" />
                </td>
                <td className="px-5 py-4">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
