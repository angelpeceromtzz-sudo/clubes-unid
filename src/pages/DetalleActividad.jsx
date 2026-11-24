import { useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAutenticacion } from '../contexts/AuthContext';
import { useActividadRecurso } from '../hooks/useActividadRecurso';
import { actividadService } from '../services/actividad.service';
import { RegistroActividad } from '../components/actividades/RegistroActividad';
import { GaleriaFotosActividad } from '../components/actividades/GaleriaFotosActividad';
import { NavegacionActividades, FechaActividad, EstadoActividad } from '../components/actividades/ActividadUI';
import { BotonAccion } from '../components/ui/BotonAccion';
import { Spinner } from '../components/ui/Spinner';
import { FormularioAsistenciaActividad } from '../components/actividades/AsistenciaActividad';
import { RegistroInvitadoMisiones } from '../components/actividades/RegistroInvitadoMisiones';
import { UbicacionEdicionActividad } from '../components/actividades/LugarEdicionActividad';
import { ReaccionesCatalogo } from '../components/actividades/ReaccionesCatalogo';

function ParticipacionEdicion({ edicion, onLoginClick }) {
  const { usuario, authReady } = useAutenticacion();
  const identidad = usuario?.id_usuario || usuario?.id;
  const { datos, cargando, error, recargar } = useActividadRecurso(usuario ? '/ediciones/' + edicion.id_edicion + '/mi-registro' : null, identidad);
  const { tema, cardCls, modoOscuro } = useTheme();
  const [mensaje, setMensaje] = useState('');

  return <>
    <ReaccionesCatalogo etiqueta="Reacciones de la actividad" totales={edicion.reacciones} reaccion={datos?.reaccion}
      autenticado={Boolean(usuario)} cargando={!authReady || Boolean(usuario && cargando)} errorCarga={error} onRecargar={recargar}
      guardarReaccion={(reaccion) => actividadService.reaccionar(edicion.id_edicion, reaccion)} onLoginClick={onLoginClick}/>
    {edicion.requiere_registro && <section className={'rounded-2xl p-5 sm:p-7 space-y-5 ' + (modoOscuro ? 'bg-[#0e162c]' : 'bg-white shadow-sm')} aria-label="Inscripción"><h3 className={'text-xl font-bold ' + tema.title}>Participa en esta edición</h3>
      {mensaje && <p role="status" className="text-emerald-700 dark:text-emerald-300">{mensaje}</p>}
      {!authReady || cargando ? <Spinner /> : !usuario ? edicion.configuracion_misiones?.version===2 ? <RegistroInvitadoMisiones edicion={edicion} onLoginClick={onLoginClick}/> : <><p className={tema.subtitle}>Inicia sesión con tu cuenta institucional para consultar o completar tu registro.</p><BotonAccion onClick={onLoginClick}>Iniciar sesión para registrarme</BotonAccion></> : error ? <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div> : <RegistroActividad key={edicion.id_edicion + ':' + identidad + ':' + (datos?.registro?.actualizado_en || 'nuevo')} edicion={edicion} registro={datos?.registro} onGuardado={(texto) => { setMensaje(texto); recargar(); }} />}
    </section>}
    {usuario && datos?.registro && <section className={'rounded-2xl border p-5 sm:p-7 space-y-4 ' + cardCls} aria-label="Mi asistencia">
      <h3 className={'text-xl font-bold ' + tema.title}>Mi asistencia</h3>
      <FormularioAsistenciaActividad key={datos.registro.id_registro + ':' + (datos.asistencia?.estado || 'sin_registro')}
        idEdicion={edicion.id_edicion} estadoInscripcion={datos.registro.estado} asistencia={datos.asistencia}
        disponibilidad={datos.disponibilidad_asistencia} />
    </section>}
  </>;
}

export function DetalleActividad({ onLoginClick }) {
  const { slug } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const { usuario } = useAutenticacion();
  const { datos, cargando, error, recargar } = useActividadRecurso('/detalle/' + encodeURIComponent(slug), 'publico', true);
  const { tema, inputCls } = useTheme();
  if (cargando) return <Spinner className="py-20" />;
  if (error) return <main className="max-w-5xl mx-auto px-6 py-10"><NavegacionActividades /><p role="alert">{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></main>;
  const { actividad, ediciones, hoy } = datos;
  if(actividad.tipo==='club') return <Navigate to={'/campus/campeche/portal/club/'+actividad.id_club} replace/>;
  const pedida = Number(parametros.get('edicion'));
  const edicion = ediciones.find((item) => item.id_edicion === pedida) || [...ediciones].reverse().find((item) => (item.fecha_fin || item.fecha_inicio) >= hoy) || ediciones[0];
  return <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
    <NavegacionActividades />
    <header className="space-y-4"><p className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">{actividad.categoria}</p><h1 className={'text-3xl sm:text-5xl font-black ' + tema.title}>{actividad.nombre}</h1><p className={'whitespace-pre-line leading-relaxed ' + tema.subtitle}>{actividad.descripcion}</p>{actividad.url_imagen && <img src={actividad.url_imagen} alt={actividad.nombre} className="w-full max-h-96 object-cover rounded-2xl" />}</header>
    {!edicion ? <p className={tema.subtitle}>Aquí se anunciarán las próximas ediciones y sus fechas de inscripción.</p> : <>
      {ediciones.length > 1 && <label className="block font-semibold">Consultar edición<select className={inputCls + ' mt-2 max-w-md'} value={edicion.id_edicion} onChange={(evento) => setParametros({ edicion: evento.target.value })}>{ediciones.map((item) => <option key={item.id_edicion} value={item.id_edicion}>{item.nombre}</option>)}</select></label>}
      <section className="space-y-4"><EstadoActividad estado={edicion.estado_registro} /><h2 className={'text-2xl font-bold ' + tema.title}>{edicion.nombre}</h2><p><FechaActividad fecha={edicion.fecha_inicio} hora={edicion.hora_inicio} />{edicion.fecha_fin && edicion.fecha_fin !== edicion.fecha_inicio && <> al <FechaActividad fecha={edicion.fecha_fin} /></>}</p><UbicacionEdicionActividad edicion={edicion} /><p className={'whitespace-pre-line ' + tema.subtitle}>{edicion.descripcion}</p>{edicion.requiere_registro && <p className={'text-sm ' + tema.subtitle}>Inscripciones: <FechaActividad fecha={edicion.inscripcion_desde} /> al <FechaActividad fecha={edicion.inscripcion_hasta} /></p>}</section>
      <ParticipacionEdicion key={edicion.id_edicion + ':' + (usuario?.id_usuario || usuario?.id || 'invitado')} edicion={edicion} onLoginClick={onLoginClick} />
      <GaleriaFotosActividad key={'galeria:' + edicion.id_edicion} fotos={edicion.fotos} titulo={actividad.nombre} />
    </>}
  </main>;
}
