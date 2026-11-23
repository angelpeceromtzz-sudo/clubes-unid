import { useTheme } from '../../contexts/ThemeContext';
import { FechaActividad } from './ActividadUI';
import { etiquetaParticipacion, etiquetaNivel } from '../../constants/clubes';
import { DocumentoMisiones } from './DocumentoMisiones';
import { UbicacionEdicionActividad } from './LugarEdicionActividad';
import { esFormatoMegamisiones } from '../../../shared/actividades';

export function VistaPreviaActividad({ actividad, edicion, catalogo=[] }) {
  const {tema,cardCls}=useTheme();
  return <section className="space-y-5" aria-label={edicion ? 'Vista previa de la edición' : 'Vista previa de la actividad'}>
    <article className={'overflow-hidden rounded-2xl border '+cardCls}>
      {actividad.url_imagen && <img src={actividad.url_imagen} alt="" className="w-full max-h-64 object-cover"/>}
      <div className="p-5 sm:p-6 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">{actividad.categoria}</p>
        <h3 className={'text-2xl font-black '+tema.title}>{actividad.nombre}</h3>
        <p className={'whitespace-pre-line break-words '+tema.subtitle}>{actividad.descripcion}</p>
        {actividad.tipo==='club' && <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs font-bold">Cupo</dt><dd>{actividad.cupo_maximo} integrantes</dd></div><div><dt className="text-xs font-bold">Participación</dt><dd>{etiquetaParticipacion(actividad.participacion)}</dd></div><div><dt className="text-xs font-bold">Niveles</dt><dd>{(actividad.niveles || []).map(etiquetaNivel).join(', ')}</dd></div></dl>}
        {edicion && <section className="border-t border-slate-400/25 pt-4 space-y-3">
          <h4 className="text-xl font-bold">{edicion.nombre}</h4>
          <p><FechaActividad fecha={edicion.fecha_inicio} hora={edicion.hora_inicio}/>{edicion.fecha_fin && edicion.fecha_fin!==edicion.fecha_inicio && <> al <FechaActividad fecha={edicion.fecha_fin}/></>}</p>
          <UbicacionEdicionActividad edicion={edicion} />
          {edicion.descripcion && <p className="whitespace-pre-line break-words">{edicion.descripcion}</p>}
          {edicion.requiere_registro ? <>
            <p className="text-sm">Inscripciones: <FechaActividad fecha={edicion.inscripcion_desde}/> al <FechaActividad fecha={edicion.inscripcion_hasta}/></p>
             <div className="space-y-2 rounded-xl bg-amber-400/10 p-4"><p className="font-semibold">Datos para registrarse</p><ul className="list-disc space-y-1 pl-5 text-sm"><li>{esFormatoMegamisiones(edicion.configuracion_misiones) ? 'MEGAMISIONES · preguntas de esta edición. UNID: nombre y correo institucionales, matrícula y celular. Invitados: nombre completo, correo y celular.' : edicion.configuracion_misiones ? 'UNID: nombre y matrícula. Invitados sin cuenta: nombre, correo y teléfono.' : 'Nombre completo y matrícula'}</li>{edicion.campos_registro.map((campo)=><li key={campo.clave}>{campo.imagen_url && <img src={campo.imagen_url} alt={'Imagen para ' + campo.etiqueta} className="my-2 h-20 w-32 rounded object-cover" />}{campo.etiqueta}{campo.visible_si ? ' · obligatorio cuando corresponda' : campo.obligatorio ? ' · obligatorio' : ' · opcional'}{campo.tipo==='seleccion' && campo.opciones?.length>0 && <span className="block text-xs">Opciones: {campo.opciones.join(', ')}</span>}</li>)}</ul></div>
            {edicion.configuracion_misiones && <section className="space-y-3"><h5 className="font-bold">Artículos y código de conducta</h5>{edicion.configuracion_misiones.informacion_kit && <p className="whitespace-pre-line text-sm">{edicion.configuracion_misiones.informacion_kit}</p>}{edicion.configuracion_misiones.productos.filter((producto)=>producto.activo).map((producto)=><p key={producto.id_producto} className="text-sm">{producto.nombre} · {(producto.precio_centavos/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}{producto.requiere_talla ? ' · Tallas: '+producto.tallas.join(', ') : ''}</p>)}<p className="text-sm">El PDF firmado es {edicion.configuracion_misiones.codigo_obligatorio ? 'obligatorio' : 'opcional'} para inscribirse.</p><DocumentoMisiones id={edicion.configuracion_misiones.codigo_documento}>Revisar código de conducta</DocumentoMisiones></section>}
            {(edicion.requiere_aportacion || catalogo.length > 0) && <div className="space-y-2"><p className="font-semibold">Aportaciones para la actividad · {edicion.requiere_aportacion ? 'obligatorias' : 'opcionales'}</p><p className="text-sm">Comida, globos u otros materiales, independientes del regalo.</p>{catalogo.filter((opcion)=>opcion.activa!==false).length ? <ul className="list-disc pl-5 text-sm space-y-1">{catalogo.filter((opcion)=>opcion.activa!==false).map((opcion,indice)=><li key={opcion.id_opcion || indice}>{opcion.nombre} · mínimo {Number(opcion.cantidad_minima)} {opcion.unidad}{opcion.descripcion && <p>{opcion.descripcion}</p>}</li>)}</ul> : <p className="text-sm text-amber-700 dark:text-amber-300">Falta configurar las opciones de aportación.</p>}</div>}
             {actividad.plantilla === 'trineo' && <p className="text-sm">Carta de regalo {edicion.carta_obligatoria !== false ? 'obligatoria' : 'opcional'}: {edicion.carta_obligatoria !== false ? 'cada alumno buscará al niño de su carta y lo reservará al confirmar su inscripción.' : 'el alumno puede elegir una carta o continuar sin ella.'} El encargado recibirá el regalo por separado de las aportaciones para la actividad.</p>}
            <span className="inline-block rounded-xl bg-amber-400 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-900">Inscribirme · vista previa</span>
          </> : <p className="text-sm">Actividad informativa, sin inscripción.</p>}
        </section>}
      </div>
    </article>
    {edicion?.destacable && <p className={'text-sm '+tema.subtitle}>Se destacará en el sitio del <FechaActividad fecha={edicion.destacada_desde}/> al <FechaActividad fecha={edicion.destacada_hasta}/>.</p>}
  </section>;
}
