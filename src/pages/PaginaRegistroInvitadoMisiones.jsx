import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { misionesService } from '../services/misiones.service';
import { extraerAccesoMisiones, leerAccesoMisiones, guardarAccesoMisiones, enlacePrivadoMisiones } from '../utils/accesoMisiones';
import { RegistroMisiones } from '../components/actividades/RegistroMisiones';
import { FormularioAsistenciaActividad } from '../components/actividades/AsistenciaActividad';
import { NavegacionActividades } from '../components/actividades/ActividadUI';
import { BotonAccion } from '../components/ui/BotonAccion';
import { Spinner } from '../components/ui/Spinner';

export function PaginaRegistroInvitadoMisiones() {
  const { folio } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { tema, cardCls, inputCls } = useTheme();
  const [acceso] = useState(() => extraerAccesoMisiones(window.location.href, window.location.origin) || leerAccesoMisiones(folio));
  const [datos, setDatos] = useState(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState(location.state?.nuevaInscripcion ? location.state.correoEnviado ? 'Tu inscripción está confirmada. También enviamos tu enlace por correo.' : 'Tu inscripción está confirmada. No pudimos enviar el correo; guarda tu enlace y utiliza Reenviar correo.' : '');
  const [reenviando, setReenviando] = useState(false);
  useEffect(() => {
    let activo = true;
    if (!acceso) return;
    misionesService.consultarInvitado(acceso).then((resultado) => {
      if (!activo) return;
      guardarAccesoMisiones(acceso, resultado.registro.id_edicion);
      setDatos(resultado);
      if (location.hash) navigate(location.pathname + location.search, { replace: true, state: location.state });
    }).catch((fallo) => { if (activo) setError(fallo.message); });
    return () => { activo = false; };
  }, [acceso, version, location.hash, location.pathname, location.search, location.state, navigate]);
  const enlace = acceso ? enlacePrivadoMisiones(acceso, window.location.origin) : '';
  async function reenviar() {
    setReenviando(true); setError('');
    try { await misionesService.reenviarEnlace(acceso); setMensaje('Enlace enviado a tu correo.'); }
    catch (fallo) { setError(fallo.message); }
    finally { setReenviando(false); }
  }
  return <main className="mx-auto max-w-4xl px-5 py-10 space-y-6">
    <NavegacionActividades />
    <header><p className="text-sm font-bold text-amber-600 dark:text-amber-400">Misiones UNID</p><h1 className={'text-3xl font-black ' + tema.title}>Mi inscripción de invitado</h1></header>
    {mensaje && <p role="status" className="rounded-xl bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">{mensaje}</p>}
    {error && <div role="alert" className="space-y-3"><p className="text-red-600 dark:text-red-400">{error}</p>{acceso && <BotonAccion variant="outline" onClick={() => { setError(''); setVersion((actual) => actual + 1); }}>Volver a intentar</BotonAccion>}</div>}
    {!acceso ? <p>Abre el enlace completo que recibiste al inscribirte o en tu correo para consultar tu registro.</p> : !datos && !error ? <Spinner /> : datos && <>
      <section className={'rounded-2xl border p-5 space-y-4 ' + cardCls}>
        <h2 className="text-xl font-bold">{datos.edicion.nombre}</h2>
        <p className="break-words text-sm">Folio: {datos.registro.folio}</p>
        <label className="block text-sm font-semibold">Guarda tu enlace privado<input className={inputCls + ' mt-2'} readOnly value={enlace} onFocus={(evento) => evento.target.select()} /></label>
        <div className="flex flex-wrap gap-3"><BotonAccion variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(enlace); setMensaje('Enlace copiado.'); } catch { setMensaje('Selecciona y copia el enlace que aparece arriba.'); } }}>Copiar enlace</BotonAccion><BotonAccion variant="outline" size="sm" disabled={reenviando} onClick={reenviar}>{reenviando ? 'Enviando…' : 'Reenviar correo'}</BotonAccion></div>
      </section>
      <section className={'rounded-2xl border p-5 sm:p-7 ' + cardCls} aria-label="Formulario de registro"><RegistroMisiones key={datos.registro.actualizado_en} edicion={datos.edicion} registro={datos.registro} invitado acceso={acceso} onGuardado={(resultado) => { setDatos(resultado); setMensaje('Cambios guardados.'); }} /></section>
      <section className={'rounded-2xl border p-5 space-y-4 ' + cardCls}><h2 className="text-xl font-bold">Mi asistencia</h2><FormularioAsistenciaActividad idEdicion={datos.registro.id_edicion} estadoInscripcion={datos.registro.estado} asistencia={datos.asistencia} disponibilidad={datos.disponibilidad_asistencia} accesoInvitado={acceso} /></section>
    </>}
  </main>;
}
