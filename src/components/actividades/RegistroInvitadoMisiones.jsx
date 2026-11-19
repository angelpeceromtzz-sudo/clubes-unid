import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegistroMisiones } from './RegistroMisiones';
import { BotonAccion } from '../ui/BotonAccion';
import { guardarAccesoMisiones, leerAccesoMisiones } from '../../utils/accesoMisiones';

export function RegistroInvitadoMisiones({ edicion, onLoginClick }) {
  const navigate = useNavigate();
  const [invitado, setInvitado] = useState(false);
  const previo = leerAccesoMisiones('edicion_' + edicion.id_edicion);
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3"><BotonAccion variant="outline" onClick={onLoginClick}>Soy UNID · Iniciar sesión</BotonAccion><BotonAccion onClick={() => setInvitado(true)}>Soy invitado · Registrarme</BotonAccion></div>
    {previo && <Link className="inline-block font-semibold text-amber-700 underline dark:text-amber-300" to={'/actividades/misiones/registro/' + previo.folio}>Consultar mi inscripción de invitado</Link>}
    {invitado && <RegistroMisiones edicion={edicion} invitado onGuardado={(resultado) => {
      const acceso = { folio: resultado.registro.folio, token: resultado.token };
      guardarAccesoMisiones(acceso, edicion.id_edicion);
      navigate('/actividades/misiones/registro/' + acceso.folio + '#acceso=' + acceso.token, { state: { nuevaInscripcion: true, correoEnviado: resultado.correo_enviado } });
    }} />}
  </div>;
}
