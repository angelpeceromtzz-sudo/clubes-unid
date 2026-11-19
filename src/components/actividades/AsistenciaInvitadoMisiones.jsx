import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { misionesService } from '../../services/misiones.service';
import { extraerAccesoMisiones, guardarAccesoMisiones, leerAccesoMisiones } from '../../utils/accesoMisiones';
import { FormularioAsistenciaActividad } from './AsistenciaActividad';
import { BotonAccion } from '../ui/BotonAccion';
import { Spinner } from '../ui/Spinner';

export function AsistenciaInvitadoMisiones({ idEdicion, codigo }) {
  const { cardCls, inputCls, labelCls } = useTheme();
  const [disponible, setDisponible] = useState(false);
  const [acceso, setAcceso] = useState(() => leerAccesoMisiones('edicion_' + idEdicion));
  const [enlace, setEnlace] = useState('');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let activo = true;
    misionesService.disponibilidadInvitados(idEdicion).then((resultado) => { if (activo) setDisponible(resultado.habilitado); }).catch(() => {});
    return () => { activo = false; };
  }, [idEdicion]);
  useEffect(() => {
    let activo = true;
    if (!disponible || !acceso) return;
    misionesService.consultarInvitado(acceso).then((resultado) => {
      if (!activo) return;
      if (resultado.registro.id_edicion !== Number(idEdicion)) throw new Error('Ese enlace pertenece a otra edición de Misiones. Usa el enlace de esta edición.');
      guardarAccesoMisiones(acceso, idEdicion);
      setDatos(resultado);
    }).catch((fallo) => { if (activo) setError(fallo.message); });
    return () => { activo = false; };
  }, [disponible, acceso, idEdicion]);
  if (!disponible) return null;
  return <section aria-label="Asistencia de invitados" className={'rounded-2xl border p-5 space-y-4 ' + cardCls}>
    <h2 className="text-xl font-bold">Me inscribí como invitado</h2>
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    {datos ? <><p className="font-semibold">{datos.registro.nombre_completo} · {datos.edicion.nombre}</p><FormularioAsistenciaActividad key={acceso.folio + ':' + codigo} idEdicion={idEdicion} estadoInscripcion={datos.registro.estado} asistencia={datos.asistencia} disponibilidad={datos.disponibilidad_asistencia} codigoInicial={codigo} origenInicial={codigo ? 'qr' : 'codigo'} accesoInvitado={acceso} /><BotonAccion variant="outline" size="sm" onClick={() => { setDatos(null); setAcceso(null); setError(''); }}>Usar otro enlace de invitado</BotonAccion></> : acceso && !error ? <Spinner /> : <form className="space-y-3" onSubmit={(evento) => {
      evento.preventDefault();
      const encontrado = extraerAccesoMisiones(enlace, window.location.origin);
      if (!encontrado) { setError('Pega el enlace privado completo que recibiste al inscribirte o por correo.'); return; }
      setError(''); setAcceso(encontrado);
    }}><p className="text-sm">Pega tu enlace privado de inscripción para identificarte. El código del QR se conservará.</p><label className={labelCls}>Mi enlace privado<input className={inputCls} required type="text" maxLength={2048} autoComplete="off" value={enlace} onChange={(evento) => setEnlace(evento.target.value)} /></label><BotonAccion type="submit">Continuar como invitado</BotonAccion></form>}
  </section>;
}
