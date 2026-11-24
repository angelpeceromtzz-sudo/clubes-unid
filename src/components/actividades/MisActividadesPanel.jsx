import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { EstadoActividad, FechaActividad } from './ActividadUI';
import { BotonAccion } from '../ui/BotonAccion';
import { Spinner } from '../ui/Spinner';
import { FormularioAsistenciaActividad } from './AsistenciaActividad';
import { ResumenCartaTrineo } from './CartaTrineo';

export function MisActividadesPanel({ onLoginClick }) {
  const { usuario, authReady } = useAutenticacion();
  const { datos, error, cargando, recargar } = useActividadRecurso(usuario?.id_rol===1 ? '/mis-registros' : null, usuario?.id_usuario || usuario?.id);
  const { tema, cardCls } = useTheme();
  if(usuario && usuario.id_rol!==1) return null;
  return <section className="space-y-5" aria-label="Mis actividades">
    <div><h2 className={'text-2xl font-black ' + tema.title}>Mis actividades</h2><p className={'mt-2 text-sm '+tema.subtitle}>Consulta tus inscripciones, aportaciones y próximas participaciones.</p></div>
    {!authReady || cargando ? <Spinner /> : !usuario ? <BotonAccion onClick={onLoginClick}>Iniciar sesión</BotonAccion> : error ? <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div> : <div className="space-y-5">
      {!datos?.length && <div className={'rounded-2xl border p-6 space-y-3 '+cardCls}><p className={tema.subtitle}>Todavía no tienes registros en actividades.</p><Link to="/actividades" className="inline-block text-amber-600 dark:text-amber-400 font-semibold underline">Explorar actividades</Link></div>}
      {datos?.map((registro) => <article key={registro.id_registro} className={'rounded-2xl border p-5 space-y-3 ' + cardCls}>
        <EstadoActividad estado={registro.estado} /><h3 className={'text-xl font-bold ' + tema.title}>{registro.actividad_nombre}</h3>
        <p>{registro.edicion_nombre} · <FechaActividad fecha={registro.fecha_inicio} /></p>
        {registro.respuestas.talla && <p className="text-sm">Talla de camisa: {registro.respuestas.talla}</p>}
        <details className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3" open>
          <summary className="cursor-pointer font-semibold text-amber-700 dark:text-amber-300">Carta del Trineo</summary>
          <div className="accordion-content pt-3"><div><ResumenCartaTrineo carta={registro.carta} /></div></div>
        </details>
        {registro.aportaciones.filter((aporte) => aporte.estado !== 'cancelada' && !aporte.es_regalo_carta).map((aporte) => <p key={aporte.id_aportacion} className="text-sm">Aportación para la actividad · {aporte.nombre}: {Number(aporte.cantidad)} {aporte.unidad} · {aporte.estado}</p>)}
        <section className="space-y-3 border-t border-slate-400/25 pt-4" aria-label={'Asistencia a ' + registro.edicion_nombre}>
          <h4 className={'font-bold ' + tema.title}>Mi asistencia</h4>
          <FormularioAsistenciaActividad key={registro.id_registro + ':' + (registro.asistencia?.estado || 'sin_registro')}
            idEdicion={registro.id_edicion} estadoInscripcion={registro.estado} asistencia={registro.asistencia}
            disponibilidad={registro.disponibilidad_asistencia} />
        </section>
        <Link className="inline-block text-amber-600 dark:text-amber-400 font-semibold underline" to={'/actividades/' + registro.actividad_slug + '?edicion=' + registro.id_edicion}>Consultar mi registro</Link>
      </article>)}
    </div>}
  </section>;
}
