import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FormularioActividad, AsignarEncargadoActividad, AccionesRevisionActividad } from './EditoresActividad';
import { VistaPreviaActividad } from './VistaPreviaActividad';
import { EstadoActividad } from './ActividadUI';
import { BotonAccion } from '../ui/BotonAccion';

export function DetalleRevisionActividad({actividad,puedeAprobar,puedeAsignar,pendiente,operar,onActualizar}) {
  const {cardCls,tema}=useTheme();
  const [verPublicada,setVerPublicada]=useState(false);
  const propuesta=!verPublicada && actividad.propuesta;
  return <section aria-label="Información general y revisión" className={'rounded-2xl border p-5 sm:p-7 space-y-6 '+cardCls}>
    <header className="space-y-2"><p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Información general · {actividad.tipo==='club' ? 'Club' : 'Actividad'}</p><h3 className="text-2xl font-black">Descripción y presentación</h3><EstadoActividad estado={actividad.estado_propuesta || actividad.estado}/><p className={'text-sm '+tema.subtitle}>{actividad.tipo==='club' ? 'Revisa la presentación del club que se mostrará en Oferta. Sus miembros, horarios y convocatorias se administran desde el panel del club.' : 'Esta descripción se muestra en Oferta. Las fechas y el registro de participantes se configuran en cada edición.'}</p></header>
    {actividad.propuesta && <div className="flex flex-wrap items-center gap-3"><p className="text-sm font-semibold">{verPublicada ? 'Versión publicada' : 'Vista previa de la propuesta'}</p><BotonAccion variant="outline" size="sm" onClick={()=>setVerPublicada((actual)=>!actual)}>{verPublicada ? 'Ver propuesta' : 'Comparar con la versión publicada'}</BotonAccion></div>}
    <p className={'text-sm '+tema.subtitle}>Responsable: <span className="font-semibold">{actividad.responsable_nombre || 'Sin asignar'}</span></p>
    <VistaPreviaActividad actividad={{...actividad,...(propuesta || {})}}/>
    <section aria-label="Revisión de la información general" className="space-y-3 rounded-xl bg-amber-400/10 p-4"><h3 className="font-bold">Publicación de la información general</h3><p className="text-sm">Rectoría aprueba la descripción y su presentación en Oferta.</p><fieldset disabled={pendiente}><AccionesRevisionActividad tipo="actividades" entidad={actividad} puedeAprobar={puedeAprobar} operar={operar} bloqueoPublicacion={verPublicada && actividad.propuesta ? 'Abre la propuesta para revisarla antes de aprobar.' : ''}/></fieldset></section>
    <details className="border-t border-slate-400/25 pt-4"><summary className="cursor-pointer font-semibold">Editar información general</summary><div className="pt-5"><FormularioActividad key={actividad.id_actividad+':'+actividad.actualizado_en} actividad={actividad} onGuardado={onActualizar}/></div></details>
    {puedeAsignar && <details className="border-t border-slate-400/25 pt-4"><summary className="cursor-pointer font-semibold">Responsable</summary><div className="pt-5"><AsignarEncargadoActividad key={actividad.id_actividad+':'+actividad.id_responsable} actividad={actividad} onGuardado={onActualizar}/></div></details>}
  </section>;
}
