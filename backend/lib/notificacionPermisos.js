// Matriz de permisos para crear notificaciones (auditoría H7).
//
// Flujo observado en el producto:
// - Panel admin → SeccionAnuncios → FormularioNotificacion sin audiencia
//   fija: puede elegir global / presidentes / alumnos / club (con selector
//   de club). Emisor: rol 3.
// - Panel presidente → SeccionAvisos → FormularioNotificacion con
//   audienciaFija="club" para su club. Emisores: roles 2 y 5.
// - El rol 1 (alumno) solo consume notificaciones (GET de bandeja); no existe
//   UI ni regla documentada que le permita emitirlas.
// - id_destinatario (notificaciones personales, migración legacy) no tiene
//   UI actual; la lectura de la bandeja lo admite para cualquier rol, pero la
//   emisión se reserva a roles institucionales (3 y 4).
//
// REGLA DE NEGOCIO PENDIENTE de confirmar con el equipo:
// - ¿El rol 4 (rectoría) debe poder emitir anuncios con las mismas
//   audiencias que el rol 3? No hay UI de rectoría para esto; aquí se permite
//   por paridad institucional (la lectura ya trata a 3 y 4 por igual).
// - Semántica exacta de id_destinatario combinada con audiencia (p. ej. un
//   directo con audiencia 'alumnos'): solo se valida tipo/pertenencia de rol;
//   la lógica de entrega la define la consulta de bandeja.

export const AUDIENCIAS_NOTIFICACION = ['global', 'presidentes', 'alumnos', 'club'];

import { ROL_RESPONSABLE_CLUB, ROL_VICEPRESIDENTE, ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION } from '../constants/roles.js';

const ROLES_LIDER = [ROL_RESPONSABLE_CLUB, ROL_VICEPRESIDENTE];
const ROLES_INSTITUCIONALES = [ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION];

function esIdEnteroPositivo(valor) {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
}

/**
 * Valida la creación de una notificación según rol, audiencia, club y
 * destinatario. Función pura: la ruta aporta la fila del club ya consultada
 * (o null si no existe / no se pidió).
 *
 * @param {object} params
 * @param {number} params.idRol - Rol del emisor (token JWT).
 * @param {number} params.idEmisor - id del emisor.
 * @param {string} params.audiencia - Audiencia pedida en el body.
 * @param {number|null} [params.idClub] - Club pedido en el body.
 * @param {number|null} [params.idDestinatario] - Destinatario personal pedido.
 * @param {{id_club:number,id_responsable_club:number,id_vicepresidente:number}|null} [params.club]
 *        Fila del club consultado en BD para idClub (null si no existe).
 * @returns {{permitido:boolean, status:number|null, error:string|null,
 *            valores:{id_club:number|null, id_destinatario:number|null}}}
 */
export function validarCreacionNotificacion({
  idRol,
  idEmisor,
  audiencia,
  idClub = null,
  idDestinatario = null,
  club = null,
}) {
  const rechazar = (status, error) => ({
    permitido: false,
    status,
    error,
    valores: { id_club: null, id_destinatario: null },
  });

  if (!AUDIENCIAS_NOTIFICACION.includes(audiencia)) {
    return rechazar(400, 'Audiencia no válida');
  }

  if (ROLES_LIDER.includes(idRol)) {
    if (audiencia !== 'club') {
      return rechazar(
        403,
        'Los presidentes y vicepresidentes solo pueden enviar notificaciones a su club'
      );
    }
    if (idDestinatario !== null && idDestinatario !== undefined) {
      return rechazar(403, 'Los líderes no pueden enviar notificaciones personales');
    }
    if (!esIdEnteroPositivo(idClub)) {
      return rechazar(400, 'id_club es obligatorio para audiencia club');
    }
    if (!club) {
      return rechazar(404, 'Club no encontrado');
    }
    if (club.id_responsable_club !== idEmisor && club.id_vicepresidente !== idEmisor) {
      return rechazar(403, 'No eres líder de este club');
    }
    return {
      permitido: true,
      status: null,
      error: null,
      valores: { id_club: idClub, id_destinatario: null },
    };
  }

  if (ROLES_INSTITUCIONALES.includes(idRol)) {
    if (audiencia === 'club') {
      if (!esIdEnteroPositivo(idClub)) {
        return rechazar(400, 'id_club es obligatorio para audiencia club');
      }
      if (!club) {
        return rechazar(404, 'Club no encontrado');
      }
    }
    if (idDestinatario !== null && idDestinatario !== undefined) {
      if (!esIdEnteroPositivo(idDestinatario)) {
        return rechazar(400, 'id_destinatario no válido');
      }
      return {
        permitido: true,
        status: null,
        error: null,
        valores: {
          id_club: audiencia === 'club' ? idClub : null,
          id_destinatario: idDestinatario,
        },
      };
    }
    return {
      permitido: true,
      status: null,
      error: null,
      valores: { id_club: audiencia === 'club' ? idClub : null, id_destinatario: null },
    };
  }

  return rechazar(403, 'No tienes permisos para esta acción');
}
