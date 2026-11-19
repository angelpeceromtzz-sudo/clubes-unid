import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { actividadService } from '../../services/actividad.service';
import { normalizarCodigoAsistencia } from '../../../shared/actividades';
import { BotonAccion } from '../ui/BotonAccion';
import { misionesService } from '../../services/misiones.service';

export function ResumenAsistenciaActividad({ asistencia }) {
  if (asistencia?.estado !== 'presente') return <p className="text-sm">Sin asistencia registrada</p>;
  const fecha = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City',
  }).format(new Date(asistencia.registrada_en));
  return <div className="space-y-1 text-sm text-emerald-700 dark:text-emerald-300" role="status">
    <p className="font-bold">Asistencia registrada</p>
    <time dateTime={asistencia.registrada_en}>{fecha}</time>
  </div>;
}

export function FormularioAsistenciaActividad({
  idEdicion, estadoInscripcion, asistencia, disponibilidad, codigoInicial = '', origenInicial = 'codigo', accesoInvitado,
}) {
  const { tema, inputCls, labelCls } = useTheme();
  const [codigo, setCodigo] = useState(codigoInicial);
  const [resultado, setResultado] = useState(null);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState('');
  const actual = resultado || asistencia;

  async function registrar(evento) {
    evento.preventDefault();
    if (pendiente) return;
    setError('');
    try {
      const normalizado = normalizarCodigoAsistencia(codigo);
      setPendiente(true);
      const origen = codigo === codigoInicial ? origenInicial : 'codigo';
      const respuesta = accesoInvitado ? await misionesService.asistencia(accesoInvitado, normalizado, origen) : await actividadService.registrarAsistencia(idEdicion, normalizado, origen);
      setResultado(respuesta.asistencia);
    } catch (fallo) {
      setError(fallo.message);
    } finally { setPendiente(false); }
  }

  if (actual?.estado === 'presente') return <ResumenAsistenciaActividad asistencia={actual} />;
  if (actual?.estado === 'anulada') return <p className={'text-sm ' + tema.subtitle}>El encargado corrigió tu asistencia. Solicita que revise tu registro.</p>;
  if (estadoInscripcion !== 'confirmado') return <p className={'text-sm ' + tema.subtitle}>Necesitas una inscripción confirmada para registrar tu llegada.</p>;
  if (disponibilidad !== 'disponible') {
    const mensajes = {
      proxima: 'Podrás registrar tu llegada durante las fechas de la actividad.',
      finalizada: 'El periodo para registrar tu llegada terminó. Si necesitas ayuda, consulta al encargado.',
      no_disponible: 'El pase de lista de esta edición no está disponible.',
    };
    return <p className={'text-sm ' + tema.subtitle}>{mensajes[disponibilidad] || mensajes.no_disponible}</p>;
  }
  return <form onSubmit={registrar} className="space-y-3" aria-label="Registrar mi asistencia">
    <p className={'text-sm ' + tema.subtitle}>Escribe el código que comparte el encargado en la actividad para registrar tu llegada.</p>
    <label className={labelCls}>Código de asistencia
      <input className={inputCls + ' mt-2 max-w-xs font-mono uppercase tracking-widest'} value={codigo}
        onChange={(evento) => setCodigo(evento.target.value)} placeholder="ABCD 2345" maxLength={11}
        autoComplete="off" autoCapitalize="characters" spellCheck={false} required disabled={pendiente} />
    </label>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    <BotonAccion type="submit" disabled={pendiente}>{pendiente ? 'Registrando…' : 'Registrar mi asistencia'}</BotonAccion>
  </form>;
}
