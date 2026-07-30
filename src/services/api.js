import { request } from './api-core';
import { autenticacionService } from './autenticacion.service';
import { clubService } from './club.service';
import { usuarioService } from './usuario.service';
import { inscripcionService } from './inscripcion.service';
import { notificacionService } from './notificacion.service';
import { avisoService } from './aviso.service';
import { miembroService } from './miembro.service';
import { historialService } from './historial.service';
import { convocatoriaService } from './convocatoria.service';
import { ofertaService } from './oferta.service';
import { horarioService } from './horario.service';
import { diapositivaService } from './diapositiva.service';
import { uploadService } from './upload.service';
import { dashboardService } from './dashboard.service';

export { API_BASE, getToken, setSession, clearSession, getSession, request } from './api-core';

export { autenticacionService } from './autenticacion.service';
export { clubService } from './club.service';
export { usuarioService } from './usuario.service';
export { inscripcionService } from './inscripcion.service';
export { notificacionService } from './notificacion.service';
export { avisoService } from './aviso.service';
export { miembroService } from './miembro.service';
export { historialService } from './historial.service';
export { convocatoriaService } from './convocatoria.service';
export { ofertaService } from './oferta.service';
export { horarioService } from './horario.service';
export { diapositivaService } from './diapositiva.service';
export { uploadService } from './upload.service';
export { dashboardService } from './dashboard.service';

export const api = {
  get: (endpoint) => request(endpoint),

  login: autenticacionService.login,
  loginMicrosoft: autenticacionService.loginMicrosoft,
  getMe: autenticacionService.getMe,

  getClubes: clubService.getClubes,
  getClub: clubService.getClub,
  createClub: clubService.createClub,
  updateClub: clubService.updateClub,
  updateClubEstatus: clubService.updateClubEstatus,
  updateVicepresidente: clubService.updateVicepresidente,
  asignarClubAPresidente: clubService.asignarClubAPresidente,
  getActividadClubes: clubService.getActividadClubes,
  getActividad: clubService.getActividad,

  getUsuarios: usuarioService.getUsuarios,
  createUser: usuarioService.createUser,
  deleteUser: usuarioService.deleteUser,
  updateUserRol: usuarioService.updateUserRol,
  adminAction: usuarioService.adminAction,
  asignarAlumnoClub: usuarioService.asignarAlumnoClub,

  getInscripcionActiva: inscripcionService.getInscripcionActiva,
  createInscripcion: inscripcionService.createInscripcion,
  removeFromClub: inscripcionService.removeFromClub,
  bajarMiembro: inscripcionService.bajarMiembro,
  getMisFormularios: inscripcionService.getMisFormularios,
  createFormulario: inscripcionService.createFormulario,
  getSolicitudesPendientes: inscripcionService.getSolicitudesPendientes,
  getAllSolicitudes: inscripcionService.getAllSolicitudes,
  actualizarEstatusSolicitud: inscripcionService.actualizarEstatusSolicitud,
  getMisPostulaciones: inscripcionService.getMisPostulaciones,

  getNotificaciones: notificacionService.getNotificaciones,
  createNotificacion: notificacionService.createNotificacion,
  marcarNotificacionLeida: notificacionService.marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas: notificacionService.marcarTodasNotificacionesLeidas,
  eliminarNotificacion: notificacionService.eliminarNotificacion,

  getAvisos: avisoService.getAvisos,
  createAviso: avisoService.createAviso,
  deleteAviso: avisoService.deleteAviso,

  getMiembros: miembroService.getMiembros,
  getHistorialMembresia: miembroService.getHistorialMembresia,

  getHistorial: historialService.getHistorial,

  getConvocatorias: convocatoriaService.getConvocatorias,
  getVistaPrevia: convocatoriaService.getVistaPrevia,
  createConvocatoria: convocatoriaService.createConvocatoria,
  generarConvocatorias: convocatoriaService.generarConvocatorias,
  actualizarConvocatoria: convocatoriaService.actualizarConvocatoria,
  enviarConvocatoria: convocatoriaService.enviarConvocatoria,
  deleteConvocatoria: convocatoriaService.deleteConvocatoria,
  getConvocatoriaClub: convocatoriaService.getConvocatoriaClub,
  actualizarConfiguracionConvocatoria: convocatoriaService.actualizarConfiguracionConvocatoria,
  cerrarConvocatoria: convocatoriaService.cerrarConvocatoria,
  getHistorialOfertas: convocatoriaService.getHistorialOfertas,

  asignarBloque: ofertaService.asignarBloque,
  seleccionarOfertas: ofertaService.seleccionarOfertas,
  enviarOfertas: ofertaService.enviarOfertas,
  responderOferta: ofertaService.responderOferta,

  getHorarios: horarioService.getHorarios,
  createHorario: horarioService.createHorario,
  updateHorario: horarioService.updateHorario,
  deleteHorario: horarioService.deleteHorario,

  getDiapositivasHero: diapositivaService.getDiapositivasHero,
  getDiapositivasHeroAdmin: diapositivaService.getDiapositivasHeroAdmin,
  createDiapositivaHero: diapositivaService.createDiapositivaHero,
  updateDiapositivaHero: diapositivaService.updateDiapositivaHero,
  deleteDiapositivaHero: diapositivaService.deleteDiapositivaHero,

  uploadImagen: uploadService.uploadImagen,

  getDashboardData: dashboardService.getDashboardData,
};
