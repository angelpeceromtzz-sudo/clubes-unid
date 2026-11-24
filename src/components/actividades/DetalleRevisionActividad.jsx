import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FormularioActividad, AsignarEncargadoActividad, AccionesRevisionActividad } from './EditoresActividad';
import { VistaPreviaActividad } from './VistaPreviaActividad';
import { EstadoActividad } from './ActividadUI';
import { BotonAccion } from '../ui/BotonAccion';
import { actividadService } from '../../services/actividad.service';

export function DetalleRevisionActividad({actividad,puedeAprobar,puedePublicar=false,puedeAsignar,puedeBorrar=false,pendiente,operar,onActualizar}) {
  const {cardCls,tema}=useTheme();
  const [verPublicada,setVerPublicada]=useState(false);
  // Conserva el editor y sus archivos durante el refresco automático, incluso al plegarlo.
  const [editorIniciado,setEditorIniciado]=useState(false);
  const propuesta=!verPublicada && actividad.propuesta;
  return <section aria-label="Información general y revisión" className={'rounded-2xl border p-5 sm:p-7 space-y-6 '+cardCls}>
     <header className="space-y-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">{actividad.tipo==='club' ? 'Club' : 'Actividad'}</p><h3 className="text-2xl font-black">Información general</h3></div>{puedeBorrar && actividad.tipo === 'actividad' && <BotonAccion variant="danger" disabled={pendiente} onClick={() => { if (window.confirm('¿Borrar definitivamente esta actividad y todos sus datos asociados? Esta acción no se puede deshacer.')) operar(() => actividadService.borrarActividad(actividad.id_actividad), 'Actividad borrada definitivamente.'); }}>Borrar actividad</BotonAccion>}</div><EstadoActividad estado={actividad.estado_propuesta || actividad.estado}/><p className={'text-sm '+tema.subtitle}>{actividad.tipo==='club' ? 'La presentación del club en Oferta. Sus miembros, horarios y convocatorias se administran desde el panel del club.' : 'La descripción y la imagen que se muestran en Oferta.'}</p></header>
    {actividad.propuesta && <div className="flex flex-wrap items-center gap-3"><p className="text-sm font-semibold">{verPublicada ? 'Versión publicada' : puedePublicar ? 'Borrador de cambios' : 'Vista previa de la propuesta'}</p><BotonAccion variant="outline" size="sm" onClick={()=>setVerPublicada((actual)=>!actual)}>{verPublicada ? puedePublicar ? 'Ver borrador' : 'Ver propuesta' : 'Ver versión publicada'}</BotonAccion></div>}
     <p className={'text-sm '+tema.subtitle}>Responsable principal: <span className="font-semibold">{actividad.responsable_nombre || 'Sin asignar'}</span></p>
    <VistaPreviaActividad actividad={{...actividad,...(propuesta || {})}}/>
    {(actividad.estado!=='publicada' || actividad.propuesta || puedeAprobar) && <section aria-label="Publicación de la información general" className="space-y-3 rounded-xl bg-amber-400/10 p-4"><h3 className="font-bold">Publicación</h3>{!puedePublicar && <p className="text-sm">Rectoría revisa la información general antes de publicarla.</p>}<fieldset disabled={pendiente}><AccionesRevisionActividad tipo="actividades" entidad={actividad} puedeAprobar={puedeAprobar} puedePublicar={puedePublicar} operar={operar} bloqueoPublicacion={verPublicada && actividad.propuesta ? 'Abre el borrador para publicar los cambios.' : ''}/></fieldset></section>}
    <details onToggle={(evento)=>{if(evento.currentTarget.open) setEditorIniciado(true);}} className="border-t border-slate-400/25 pt-4"><summary className="cursor-pointer font-semibold">Editar información general</summary>{editorIniciado && <div className="pt-5"><FormularioActividad actividad={actividad} puedePublicar={puedePublicar} onGuardado={(_id,confirmacion)=>onActualizar(confirmacion)}/></div>}</details>
     {puedeAsignar && <details className="border-t border-slate-400/25 pt-4"><summary className="cursor-pointer font-semibold">Responsables de la actividad</summary><div className="pt-5"><AsignarEncargadoActividad key={actividad.id_actividad+':'+actividad.id_responsable} actividad={actividad} onGuardado={onActualizar}/></div></details>}
  </section>;
}
