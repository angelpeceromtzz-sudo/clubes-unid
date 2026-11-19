import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useActividadRecurso } from '../hooks/useActividadRecurso';
import { FormularioAsistenciaActividad } from '../components/actividades/AsistenciaActividad';
import { NavegacionActividades, FechaActividad } from '../components/actividades/ActividadUI';
import { BotonAccion } from '../components/ui/BotonAccion';
import { Spinner } from '../components/ui/Spinner';
import { AsistenciaInvitadoMisiones } from '../components/actividades/AsistenciaInvitadoMisiones';
import { leerAccesoMisiones } from '../utils/accesoMisiones';

function AsistenciaCuentaUnid({ idEdicion, codigo, onLoginClick }) {
  const { usuario, authReady } = useAutenticacion();
  const { tema, cardCls } = useTheme();
  const { datos, cargando, error, recargar } = useActividadRecurso(
    usuario ? '/ediciones/' + idEdicion + '/mi-asistencia' : null, usuario?.id_usuario || usuario?.id);
  return <section aria-label="Asistencia con cuenta UNID" className={'space-y-5 rounded-2xl border p-5 sm:p-7 ' + cardCls}>
      {!authReady || cargando ? <Spinner /> : !usuario ? <>
        <p className={tema.subtitle}>Si te inscribiste con tu cuenta UNID, inicia sesión con esa cuenta para confirmar tu asistencia.</p>
        <BotonAccion onClick={onLoginClick}>Iniciar sesión para registrar mi llegada</BotonAccion>
      </> : error ? <div role="alert" className="space-y-3"><p>{error}</p><BotonAccion variant="outline" onClick={recargar}>Volver a intentar</BotonAccion></div> : datos && <>
        <div className="space-y-2"><h2 className={'text-xl font-bold ' + tema.title}>{datos.edicion.actividad_nombre}</h2><p className="font-semibold">{datos.edicion.nombre}</p><p className={'text-sm ' + tema.subtitle}><FechaActividad fecha={datos.edicion.fecha_inicio} /></p></div>
        <FormularioAsistenciaActividad key={idEdicion + ':' + codigo + ':' + (usuario.id_usuario || usuario.id)} idEdicion={idEdicion}
          estadoInscripcion={datos.estado_inscripcion} asistencia={datos.asistencia} disponibilidad={datos.disponibilidad}
          codigoInicial={codigo} origenInicial={codigo ? 'qr' : 'codigo'} />
      </>}
    </section>;
}

export function PaginaAsistenciaActividad({ onLoginClick }) {
  const { idEdicion } = useParams();
  const [parametros] = useSearchParams();
  const { usuario, authReady } = useAutenticacion();
  const { tema, cardCls } = useTheme();
  const [seleccion, setSeleccion] = useState(null);
  const [accesoGuardado] = useState(() => leerAccesoMisiones('edicion_' + idEdicion));
  const valido = /^[1-9]\d*$/.test(idEdicion) && Number.isSafeInteger(Number(idEdicion));
  const { datos, cargando, error, recargar } = useActividadRecurso(valido ? '/ediciones/' + idEdicion + '/acceso-invitados' : null);
  const invitados = datos?.habilitado === true;
  const modo = invitados ? seleccion || (usuario ? 'unid' : accesoGuardado ? 'invitado' : null) : 'unid';
  const codigo = parametros.get('codigo') || '';

  return <main className="mx-auto max-w-2xl space-y-6 px-5 py-10">
    <NavegacionActividades />
    <header className="space-y-2"><p className="text-sm font-bold text-amber-600 dark:text-amber-400">Actividades UNID</p><h1 className={'text-3xl font-black ' + tema.title}>Registra tu llegada</h1></header>
    {!valido ? <p role="alert">El enlace de asistencia no es válido.</p> : !authReady || cargando ? <section className={'rounded-2xl border p-5 space-y-3 ' + cardCls}><Spinner /><p className={'text-sm ' + tema.subtitle}>Consultando las opciones para registrar tu llegada…</p></section> : error ? <section role="alert" className={'rounded-2xl border p-5 space-y-3 ' + cardCls}>
      <h2 className="font-bold">No pudimos consultar las opciones de asistencia</h2><p>{error}</p><BotonAccion variant="outline" onClick={recargar}>Volver a intentar</BotonAccion>
    </section> : <>
      {invitados && <section aria-label="Cómo me inscribí" className="space-y-4">
        <div className="space-y-2"><h2 className={'text-xl font-bold ' + tema.title}>¿Cómo te inscribiste?</h2><p className={'text-sm ' + tema.subtitle}>Los invitados no necesitan iniciar sesión con UNID. Elige la opción de tu inscripción.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[['unid', 'Me inscribí con UNID', 'Usa tu cuenta institucional.'], ['invitado', 'Me inscribí como invitado', 'Sin cuenta UNID. Usa tu enlace de inscripción.']].map(([valor, titulo, ayuda]) => <button key={valor} type="button" aria-pressed={modo === valor} onClick={() => setSeleccion(valor)}
            className={'min-h-24 rounded-xl border p-4 text-left space-y-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ' + (modo === valor ? 'border-amber-500 bg-amber-400/10' : cardCls)}>
            <span className={'block font-bold ' + tema.title}>{titulo}</span><span className={'block text-sm ' + tema.subtitle}>{ayuda}</span>
          </button>)}
        </div>
      </section>}
      {modo === 'invitado' ? <AsistenciaInvitadoMisiones key={idEdicion} idEdicion={idEdicion} codigo={codigo} /> : modo === 'unid' ? <AsistenciaCuentaUnid key={idEdicion} idEdicion={idEdicion} codigo={codigo} onLoginClick={onLoginClick} /> : null}
    </>}
  </main>;
}
