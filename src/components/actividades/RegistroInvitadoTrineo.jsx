import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegistroActividad } from './RegistroActividad';
import { BotonAccion } from '../ui/BotonAccion';
import { guardarAccesoTrineo, leerAccesoTrineo } from '../../utils/accesoTrineo';

export function RegistroInvitadoTrineo({ edicion, onLoginClick, onRegistroAbierto }) {
  const navigate = useNavigate();
  const [invitado, setInvitado] = useState(false);
  const formularioRef = useRef(null);
  const previo = leerAccesoTrineo('edicion_' + edicion.id_edicion);
  useEffect(() => {
    if (invitado) formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [invitado]);
  function abrirRegistro() { setInvitado(true); onRegistroAbierto?.(); }
  return <div className="space-y-5">
    <div className="space-y-3"><p className="text-sm text-slate-500 dark:text-slate-400">Elige cómo deseas registrarte en esta edición.</p><div className="grid w-full gap-3 sm:grid-cols-2"><BotonAccion className="min-h-12 w-full text-center" variant="outline" onClick={onLoginClick}>Soy UNID · Iniciar sesión</BotonAccion><BotonAccion className="min-h-12 w-full text-center" onClick={abrirRegistro}>Soy invitado · Registrarme</BotonAccion></div></div>
    {previo && <Link className="inline-block font-semibold text-amber-700 underline dark:text-amber-300" to={'/actividades/trineo/registro/' + previo.folio}>Consultar mi inscripción de invitado</Link>}
    {invitado && <div ref={formularioRef}><p className="mb-3 text-sm">Completa tus datos para registrarte como invitado.</p><RegistroActividad edicion={edicion} invitado onGuardado={(resultado) => {
      const acceso = { folio: resultado.registro.folio, token: resultado.token };
      guardarAccesoTrineo(acceso, edicion.id_edicion);
      navigate('/actividades/trineo/registro/' + acceso.folio + '#acceso=' + acceso.token, { state: { nuevaInscripcion: true, correoEnviado: resultado.correo_enviado } });
    }} /></div>}
  </div>;
}
