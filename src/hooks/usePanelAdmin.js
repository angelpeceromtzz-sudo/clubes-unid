/* Hook del panel de administración: orquesta sub-hooks de usuarios, clubes, historial y feedback. */
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useFeedback } from './useFeedback';
import { useAdminClubes } from './useAdminClubes';
import { useAdminUsuarios } from './useAdminUsuarios';
import { useAdminHistorial } from './useAdminHistorial';
import { useAdminHeroDiapositivas } from './useAdminHeroDiapositivas';

export function usePanelAdmin(usuario) {
  const { esOscuro, cardCls, tableBg, thCls, tdCls, tdTitle, sbBg, sbItemBase, sbItemActive, sbItemInactive, selectCls, inputCls, labelCls, tema } = useTheme();
  const [vistaActiva, setVistaActiva] = useState('resumen');

  const { feedback, setFeedback, errorFeedback, setErrorFeedback } = useFeedback();
  const clubes = useAdminClubes(setFeedback, setErrorFeedback);
  const usuarios = useAdminUsuarios(clubes.refetchClubes, setFeedback, setErrorFeedback);
  const historial = useAdminHistorial(vistaActiva === 'historial');
  const heroDiapositivas = useAdminHeroDiapositivas(setFeedback, setErrorFeedback);

  return {
    vistaActiva,
    setVistaActiva,
    usuarios: usuarios.usuarios,
    clubes: clubes.clubes,
    loading: usuarios.loading || clubes.cargandoClubes,
    asignando: usuarios.asignando,
    showModalCrear: clubes.showModalCrear,
    editandoClub: clubes.editandoClub,
    formClub: clubes.formClub,
    enviando: clubes.enviando,
    modalError: clubes.modalError,
    feedback,
    setFeedback,
    errorFeedback,
    busqueda: usuarios.busqueda,
    setBusqueda: usuarios.setBusqueda,
    filtroRol: usuarios.filtroRol,
    setFiltroRol: usuarios.setFiltroRol,
    busquedaClubes: clubes.busquedaClubes,
    setBusquedaClubes: clubes.setBusquedaClubes,
    filtrados: usuarios.usuariosFiltrados,
    usuariosFiltrados: usuarios.usuariosFiltrados,
    clubesFiltrados: clubes.clubesFiltrados,
    historial: historial.historial,
    historialLoading: historial.historialLoading,
    isDark: esOscuro,
    totalAlumnos: usuarios.totalAlumnos,
    clubesActivos: clubes.clubesActivos,
    clubesActivosList: clubes.clubesActivosList,
    totalInscripciones: usuarios.totalInscripciones,
    cardCls,
    tableBg,
    thCls,
    tdCls,
    tdTitle,
    sbBg,
    sbItemBase,
    sbItemActive,
    sbItemInactive,
    selectCls,
    inputCls,
    labelCls,
    tema,
    user: usuario,
    handleRoleChange: usuarios.handleRoleChange,
    handleRemoveFromClub: usuarios.handleRemoveFromClub,
    handleAsignarClub: usuarios.handleAsignarClub,
    handleStatusChange: clubes.handleStatusChange,
    abrirModalCrear: clubes.abrirModalCrear,
    abrirModalEditar: clubes.abrirModalEditar,
    cerrarModal: clubes.cerrarModal,
    guardarClub: clubes.guardarClub,
    handleClubFormChange: clubes.handleClubFormChange,
    subirImagen: clubes.subirImagen,
    cargarHistorial: historial.cargarHistorial,
    showModalUsuario: usuarios.showModalUsuario,
    formUsuario: usuarios.formUsuario,
    enviandoUsuario: usuarios.enviandoUsuario,
    errorModalUsuario: usuarios.errorModalUsuario,
    abrirModalCrearUsuario: usuarios.abrirModalCrearUsuario,
    cerrarModalUsuario: usuarios.cerrarModalUsuario,
    handleUsuarioFormChange: usuarios.handleUsuarioFormChange,
    guardarUsuario: usuarios.guardarUsuario,
    handleEliminarUsuario: usuarios.handleEliminarUsuario,
    handleAsignarAlumnoClub: usuarios.handleAsignarAlumnoClub,
    modalAdmin: usuarios.modalAdmin,
    enviandoAdmin: usuarios.enviandoAdmin,
    errorAdmin: usuarios.errorAdmin,
    abrirModalAdmin: usuarios.abrirModalAdmin,
    manejarAdminAction: usuarios.manejarAdminAction,
    cerrarModalAdmin: usuarios.cerrarModalAdmin,
    hero: heroDiapositivas,
  };
}
