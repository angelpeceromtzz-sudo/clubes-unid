import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { trineoService } from '../../services/trineo.service';
import { extraerAccesoTrineo, guardarAccesoTrineo, leerAccesoTrineo } from '../../utils/accesoTrineo';
import { FormularioAsistenciaActividad } from './AsistenciaActividad';
import { BotonAccion } from '../ui/BotonAccion';
import { Spinner } from '../ui/Spinner';

export function AsistenciaInvitadoTrineo({ idEdicion, codigo }) {
  const { tema, cardCls, inputCls, labelCls } = useTheme();
  const [acceso, setAcceso] = useState(() => leerAccesoTrineo('edicion_' + idEdicion));
  const [enlace, setEnlace] = useState('');
  const [errorEnlace, setErrorEnlace] = useState('');
  const [version, setVersion] = useState(0);
  const [estado, setEstado] = useState({ clave: null, datos: null, error: '' });
  const clave = idEdicion + ':' + acceso?.folio + ':' + version;
  useEffect(() => {
    let activo = true;
    if (!acceso) return undefined;
    trineoService.consultarInvitado(acceso).then((resultado) => {
      if (!activo) return;
      if (resultado.registro.id_edicion !== Number(idEdicion)) throw new Error('Ese enlace pertenece a otra edición del Trineo.');
      guardarAccesoTrineo(acceso, idEdicion);
      setEstado({ clave, datos: resultado, error: '' });
    }).catch((fallo) => { if (activo) setEstado({ clave, datos: null, error: fallo.message }); });
    return () => { activo = false; };
  }, [acceso, idEdicion, clave]);
  const datos = acceso && estado.clave === clave ? estado.datos : null;
  const error = acceso && estado.clave === clave ? estado.error : '';
  const cargando = Boolean(acceso && !datos && !error);
  return <section aria-label="Asistencia de invitados" className={'rounded-2xl border p-5 space-y-4 ' + cardCls}>
    <div className="space-y-2"><h2 className={'text-xl font-bold ' + tema.title}>Asistencia de invitado</h2><p className={'text-sm ' + tema.subtitle}>No necesitas iniciar sesión. Tu enlace privado reconoce tu inscripción al Trineo.</p></div>
    {error && <div role="alert" className="space-y-3"><p className="text-red-600 dark:text-red-400">{error}</p><BotonAccion variant="outline" onClick={() => setVersion((actual) => actual + 1)}>Volver a intentar</BotonAccion></div>}
    {datos ? <><p className="font-semibold">{datos.registro.nombre_completo} · {datos.edicion.nombre}</p><FormularioAsistenciaActividad key={idEdicion + ':' + acceso.folio + ':' + codigo} idEdicion={idEdicion} estadoInscripcion={datos.registro.estado} asistencia={datos.asistencia} disponibilidad={datos.disponibilidad_asistencia} codigoInicial={codigo} origenInicial={codigo ? 'qr' : 'codigo'} accesoInvitado={acceso} servicioInvitado={trineoService} /><BotonAccion variant="outline" size="sm" onClick={() => { setAcceso(null); setEnlace(''); }}>Usar otro enlace de invitado</BotonAccion></> : cargando ? <><Spinner /><p className={'text-sm ' + tema.subtitle}>Buscando tu inscripción de invitado…</p></> : !error && <form className="space-y-3" onSubmit={(evento) => { evento.preventDefault(); const encontrado = extraerAccesoTrineo(enlace, window.location.origin); if (!encontrado) { setErrorEnlace('Pega el enlace privado completo que recibiste.'); return; } setErrorEnlace(''); setAcceso(encontrado); setVersion((actual) => actual + 1); }}><p className="text-sm">Pega el enlace privado que recibiste al inscribirte o por correo.</p><label className={labelCls}>Mi enlace privado<input className={inputCls + ' mt-2'} required type="text" maxLength={2048} value={enlace} onChange={(evento) => setEnlace(evento.target.value)} /></label>{errorEnlace && <p role="alert" className="text-red-600 dark:text-red-400">{errorEnlace}</p>}<BotonAccion type="submit">Buscar mi inscripción</BotonAccion></form>}
  </section>;
}
