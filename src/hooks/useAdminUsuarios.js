import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useConfirmacionPendiente } from './useConfirmacionPendiente';
import { useAdminActionModal } from './useAdminActionModal';
import { filtrarUsuarios } from '../utils/filtros';

export function useAdminUsuarios(refetchClubes, setFeedback, setErrorFeedback) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [asignando, setAsignando] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
  const [formularioUsuario, setFormularioUsuario] = useState({ nombre_completo: '', correo_institucional: '', contrasena: '', id_rol: 1 });
  const [enviandoUsuario, setEnviandoUsuario] = useState(false);
  const [errorModalUsuario, setErrorModalUsuario] = useState('');
  const [desactivados, setDesactivados] = useState([]);
  const [cargandoDesactivados, setCargandoDesactivados] = useState(true);
  const [reactivando, setReactivando] = useState({});

  const { pendiente: pendienteConfirmacion, solicitar: solicitarConfirmacion, confirmar: confirmarPendienteBase, cancelar: cancelarPendiente } = useConfirmacionPendiente();
  const { modalAdmin, enviandoAdmin, errorAdmin, abrirModalAdmin, manejarAdminAction, cerrarModalAdmin } = useAdminActionModal();

  useEffect(() => {
    api.getUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    api.getUsuariosDesactivados()
      .then(setDesactivados)
      .catch(() => setDesactivados([]))
      .finally(() => setCargandoDesactivados(false));
  }, []);

  const totalAlumnos = usuarios.filter((u) => u.id_rol === 1).length;
  const totalInscripciones = usuarios.filter((u) => u.nombre_club).length;
  const usuariosFiltrados = filtrarUsuarios(usuarios, busqueda, filtroRol);

  const refetchUsuarios = useCallback(async () => {
    try {
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
    } catch {
      // silently fail on background refresh
    }
  }, []);

  const handleRoleChange = useCallback(async (userId, nuevoRolId) => {
    try {
      await api.updateUserRol(userId, nuevoRolId);
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
      setFeedback('Rol actualizado correctamente');
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [setFeedback, setErrorFeedback]);

  const handleRemoveFromClub = useCallback((userId) => {
    solicitarConfirmacion({ tipo: 'bajaAlumno', userId });
  }, [solicitarConfirmacion]);

  const handleAsignarClub = useCallback(async (userId, clubId) => {
    setAsignando((prev) => ({ ...prev, [userId]: true }));
    try {
      const resultado = await api.asignarClubAPresidente(userId, clubId || null);
      const [usuariosActualizados] = await Promise.all([
        api.getUsuarios(),
        refetchClubes(),
      ]);
      setUsuarios(usuariosActualizados);
      if (resultado.nombre_club) {
        setFeedback(`Presidente asignado a "${resultado.nombre_club}" correctamente`);
      } else {
        setFeedback('Presidente desasignado del club correctamente');
      }
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setAsignando((prev) => ({ ...prev, [userId]: false }));
    }
  }, [refetchClubes, setFeedback, setErrorFeedback]);

  const handleAsignarAlumnoClub = useCallback(async (id_usuario, id_club) => {
    setAsignando((prev) => ({ ...prev, [id_usuario]: true }));
    try {
      const result = await api.asignarAlumnoClub(id_usuario, id_club);
      const [usuariosActualizados] = await Promise.all([
        api.getUsuarios(),
        refetchClubes(),
      ]);
      setUsuarios(usuariosActualizados);
      setFeedback(result.message || 'Alumno asignado correctamente');
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setAsignando((prev) => ({ ...prev, [id_usuario]: false }));
    }
  }, [refetchClubes, setFeedback, setErrorFeedback]);

  const handleEliminarUsuario = useCallback((userId, nombre) => {
    solicitarConfirmacion({ tipo: 'eliminar', userId, nombre });
  }, [solicitarConfirmacion]);

  const handleReactivarUsuario = useCallback(async (userId) => {
    setReactivando((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.reactivarUsuario(userId);
      const [actualizados, desactivadosActualizados] = await Promise.all([
        api.getUsuarios(),
        api.getUsuariosDesactivados(),
      ]);
      setUsuarios(actualizados);
      setDesactivados(desactivadosActualizados);
      setFeedback('Usuario reactivado correctamente');
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setReactivando((prev) => ({ ...prev, [userId]: false }));
    }
  }, [setFeedback, setErrorFeedback]);

  const abrirModalCrearUsuario = useCallback(() => {
    setFormularioUsuario({ nombre_completo: '', correo_institucional: '', contrasena: '', id_rol: 1 });
    setErrorModalUsuario('');
    setMostrarModalUsuario(true);
  }, []);

  const cerrarModalUsuario = useCallback(() => {
    setMostrarModalUsuario(false);
  }, []);

  const handleUsuarioFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormularioUsuario((prev) => ({ ...prev, [name]: value }));
  }, []);

  const guardarUsuario = useCallback(async (e) => {
    e.preventDefault();
    setErrorModalUsuario('');
    const { nombre_completo, correo_institucional, contrasena, id_rol } = formularioUsuario;
    if (!nombre_completo.trim() || !correo_institucional.trim() || !contrasena.trim()) {
      setErrorModalUsuario('Todos los campos son obligatorios');
      return;
    }
    setEnviandoUsuario(true);
    try {
      await api.createUser({ nombre_completo, correo_institucional, contrasena, id_rol: Number(id_rol) });
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
      setFeedback('Usuario creado correctamente');
      setMostrarModalUsuario(false);
    } catch (err) {
      setErrorModalUsuario(err.message);
    } finally {
      setEnviandoUsuario(false);
    }
  }, [formularioUsuario, setFeedback]);

  const confirmarPendiente = useCallback(async () => {
    try {
      await confirmarPendienteBase(async (p) => {
        if (p.tipo === 'bajaAlumno') {
          await api.removeFromClub(p.userId);
        } else if (p.tipo === 'eliminar') {
          await api.deleteUser(p.userId);
          setFeedback(`Usuario "${p.nombre}" eliminado correctamente`);
        }
        const actualizados = await api.getUsuarios();
        setUsuarios(actualizados);
      });
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [confirmarPendienteBase, setFeedback, setErrorFeedback]);

  const handleManejarAdminAction = useCallback(async (password) => {
    await manejarAdminAction(password, async (targetUser, accion) => {
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
      setFeedback(
        accion === 'promote'
          ? `"${targetUser.nombre_completo}" ahora es administrador`
          : `"${targetUser.nombre_completo}" ya no es administrador`
      );
    });
  }, [manejarAdminAction, setFeedback]);

  return {
    usuarios,
    loading: cargando,
    asignando,
    busqueda,
    setBusqueda,
    filtroRol,
    setFiltroRol,
    usuariosFiltrados,
    totalAlumnos,
    totalInscripciones,
    refetchUsuarios,
    handleRoleChange,
    handleRemoveFromClub,
    handleAsignarClub,
    handleAsignarAlumnoClub,
    handleEliminarUsuario,
    handleReactivarUsuario,
    desactivados,
    cargandoDesactivados,
    reactivando,
    showModalUsuario: mostrarModalUsuario,
    formUsuario: formularioUsuario,
    enviandoUsuario,
    errorModalUsuario,
    abrirModalCrearUsuario,
    cerrarModalUsuario,
    handleUsuarioFormChange,
    guardarUsuario,
    modalAdmin,
    enviandoAdmin,
    errorAdmin,
    abrirModalAdmin,
    manejarAdminAction: handleManejarAdminAction,
    cerrarModalAdmin,
    pendienteConfirmacion,
    confirmarPendiente,
    cancelarPendiente,
  };
}
