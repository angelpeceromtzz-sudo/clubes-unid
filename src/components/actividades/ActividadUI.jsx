import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { Spinner } from '../ui/Spinner';
import { BotonAccion } from '../ui/BotonAccion';
import { Icono } from '../ui/Icono';

export function NavegacionActividades() {
  const { estaAutenticado } = useAutenticacion();
  return <nav aria-label="Actividades" className="flex flex-wrap gap-3 text-sm font-semibold mb-7">
    <Link className="text-amber-600 dark:text-amber-400 hover:underline" to="/actividades">Todas las actividades</Link>
    <Link className="text-amber-600 dark:text-amber-400 hover:underline" to="/oferta">Oferta</Link>
    {estaAutenticado && <Link className="text-amber-600 dark:text-amber-400 hover:underline" to="/campus/campeche/alumno/panel">Mi panel</Link>}
  </nav>;
}

export function EstadoActividad({ estado }) {
  const etiquetas = { abierta: 'Inscripciones abiertas', cerrada: 'Inscripciones cerradas', proxima: 'Próximamente', finalizada: 'Finalizada', informativa: 'Actividad informativa', pendiente_completar: 'Completa tu registro', confirmado: 'Inscripción confirmada', cancelado: 'Inscripción cancelada', borrador: 'Borrador', pendiente: 'En revisión', publicada: 'Publicada', rechazada: 'Con observaciones', archivada: 'Archivada' };
  return <span className={'inline-flex rounded-full px-3 py-1 text-xs font-semibold ' + (['abierta', 'confirmado', 'publicada'].includes(estado) ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-800 dark:text-amber-300')}>{etiquetas[estado] || estado}</span>;
}

export function FechaActividad({ fecha, hora }) {
  if (!fecha) return <span>Fecha por anunciar</span>;
  return <time dateTime={fecha}>{new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(fecha + 'T12:00:00Z'))}{hora ? ' · ' + hora : ''}</time>;
}

export function TarjetaActividad({ actividad, edicion }) {
  const { cardCls, tema } = useTheme();
  return <Link to={actividad.tipo==='club' ? '/campus/campeche/portal/club/'+actividad.id_club : '/actividades/' + actividad.slug + (edicion ? '?edicion=' + edicion.id_edicion : '')} className={'group block overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-amber-400 ' + cardCls}>
    {actividad.url_imagen && <img src={actividad.url_imagen} alt="" loading="lazy" className="w-full aspect-[16/9] object-cover" />}
    <div className="p-5 space-y-3">
      <h3 className={'text-xl font-black ' + tema.title}>{actividad.nombre}</h3>
      <p className={'text-sm leading-relaxed whitespace-pre-line ' + tema.subtitle}>{actividad.descripcion}</p>
      {edicion && <><p className={'text-sm ' + tema.text}><FechaActividad fecha={edicion.fecha_inicio} hora={edicion.hora_inicio} /></p><EstadoActividad estado={edicion.estado_registro} /></>}
      <span className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">{edicion ? 'Ver esta edición' : actividad.tipo==='club' ? 'Conocer el club' : 'Conocer la actividad'}<Icono nombre="arrow-right" className="w-4 h-4" /></span>
    </div>
  </Link>;
}

export function CatalogoActividades({ soloDestacadas = false, enOferta = false }) {
  const { datos, error, cargando, recargar } = useActividadRecurso(enOferta ? '/?tipo=todos' : '/', 'publico', true);
  const { tema } = useTheme();
  if (cargando) return soloDestacadas ? null : <Spinner />;
  if (error) return soloDestacadas ? null : <div role="alert" className="space-y-3"><p>{error}</p><BotonAccion variant="outline" onClick={recargar}>Volver a intentar</BotonAccion></div>;
  const actividades = (datos?.actividades || []).filter((actividad) => !enOferta || actividad.mostrar_en_oferta);
  const destacadas = actividades.flatMap((actividad) => actividad.ediciones.filter((edicion) => edicion.destacada).map((edicion) => ({ actividad, edicion })));
  if (soloDestacadas && !destacadas.length) return null;
  return <section aria-label={soloDestacadas ? 'Actividades destacadas' : 'Actividades universitarias'} className="space-y-5">
    {soloDestacadas && <h2 className={'text-2xl font-black ' + tema.title}>Actividades destacadas</h2>}
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {soloDestacadas ? destacadas.map(({ actividad, edicion }) => <TarjetaActividad key={edicion.id_edicion} actividad={actividad} edicion={edicion} />) : actividades.map((actividad) => <TarjetaActividad key={actividad.id_actividad} actividad={actividad} />)}
    </div>
    {!soloDestacadas && !actividades.length && <p className={tema.subtitle}>Próximamente podrás conocer nuevas actividades.</p>}
  </section>;
}
