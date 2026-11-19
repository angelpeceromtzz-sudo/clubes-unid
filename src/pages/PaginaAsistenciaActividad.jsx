import { useParams, useSearchParams } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useActividadRecurso } from '../hooks/useActividadRecurso';
import { FormularioAsistenciaActividad } from '../components/actividades/AsistenciaActividad';
import { NavegacionActividades, FechaActividad } from '../components/actividades/ActividadUI';
import { BotonAccion } from '../components/ui/BotonAccion';
import { Spinner } from '../components/ui/Spinner';
import { AsistenciaInvitadoMisiones } from '../components/actividades/AsistenciaInvitadoMisiones';

export function PaginaAsistenciaActividad({ onLoginClick }) {
  const { idEdicion } = useParams();
  const [parametros] = useSearchParams();
  const { usuario, authReady } = useAutenticacion();
  const { tema, cardCls } = useTheme();
  const valido = /^[1-9]\d*$/.test(idEdicion) && Number.isSafeInteger(Number(idEdicion));
  const { datos, cargando, error, recargar } = useActividadRecurso(
    usuario && valido ? '/ediciones/' + idEdicion + '/mi-asistencia' : null, usuario?.id_usuario || usuario?.id);
  const codigo = parametros.get('codigo') || '';
  return <main className="mx-auto max-w-2xl space-y-6 px-5 py-10">
    <NavegacionActividades />
    <header className="space-y-2"><p className="text-sm font-bold text-amber-600 dark:text-amber-400">Actividades UNID</p><h1 className={'text-3xl font-black ' + tema.title}>Registra tu llegada</h1></header>
    <section className={'space-y-5 rounded-2xl border p-5 sm:p-7 ' + cardCls}>
      {!valido ? <p role="alert">El enlace de asistencia no es válido.</p> : !authReady || cargando ? <Spinner /> : !usuario ? <>
        <p className={tema.subtitle}>Si te inscribiste con tu cuenta UNID, inicia sesión con esa cuenta para confirmar tu asistencia.</p>
        <BotonAccion onClick={onLoginClick}>Iniciar sesión para registrar mi llegada</BotonAccion>
      </> : error ? <div role="alert" className="space-y-3"><p>{error}</p><BotonAccion variant="outline" onClick={recargar}>Volver a intentar</BotonAccion></div> : datos && <>
        <div className="space-y-2"><h2 className={'text-xl font-bold ' + tema.title}>{datos.edicion.actividad_nombre}</h2><p className="font-semibold">{datos.edicion.nombre}</p><p className={'text-sm ' + tema.subtitle}><FechaActividad fecha={datos.edicion.fecha_inicio} /></p></div>
        <FormularioAsistenciaActividad key={idEdicion + ':' + codigo + ':' + (usuario.id_usuario || usuario.id)} idEdicion={idEdicion}
          estadoInscripcion={datos.estado_inscripcion} asistencia={datos.asistencia} disponibilidad={datos.disponibilidad}
          codigoInicial={codigo} origenInicial={codigo ? 'qr' : 'codigo'} />
      </>}
    </section>
    {valido && <AsistenciaInvitadoMisiones idEdicion={idEdicion} codigo={codigo} />}
  </main>;
}
