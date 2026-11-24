import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegistroMisiones } from './RegistroMisiones';
import { BotonAccion } from '../ui/BotonAccion';
import { guardarAccesoMisiones, leerAccesoMisiones } from '../../utils/accesoMisiones';

export function RegistroInvitadoMisiones({ edicion, onLoginClick, onRegistroAbierto }) {
  const navigate = useNavigate();
  const [invitado, setInvitado] = useState(false);
  const previo = leerAccesoMisiones('edicion_' + edicion.id_edicion);
  return <div className="space-y-5">
    <div className="space-y-3"><p className="text-sm text-slate-500 dark:text-slate-400">Elige cómo deseas registrarte en esta edición.</p><div className="grid w-full gap-3 sm:grid-cols-2"><BotonAccion className="min-h-12 w-full text-center" variant="outline" onClick={onLoginClick}>Soy UNID · Iniciar sesión</BotonAccion><BotonAccion className="min-h-12 w-full text-center" onClick={() => { setInvitado(true); onRegistroAbierto?.(); }}>Soy invitado · Registrarme</BotonAccion></div></div>
    {previo && <Link className="inline-block font-semibold text-amber-700 underline dark:text-amber-300" to={'/actividades/misiones/registro/' + previo.folio}>Consultar mi inscripción de invitado</Link>}
    {invitado && <RegistroMisiones edicion={edicion} invitado onGuardado={(resultado) => {
      const acceso = { folio: resultado.registro.folio, token: resultado.token };
      guardarAccesoMisiones(acceso, edicion.id_edicion);
      if (resultado?.enlace) {
        const url = new URL(resultado.enlace);
        const tokenEnlace = new URLSearchParams(url.hash.slice(1)).get('acceso');
        if (tokenEnlace) acceso.token = tokenEnlace;
      }
      navigate('/actividades/misiones/registro/' + acceso.folio + '#acceso=' + acceso.token, { state: { nuevaInscripcion: true, correoEnviado: resultado.correo_enviado, enlace: resultado?.enlace } });
    }} />}
  </div>;
}
