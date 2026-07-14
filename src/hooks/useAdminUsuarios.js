/* Hook para gestión de usuarios: CRUD, filtros, modales de creación y acción admin. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

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

  const [modalAdmin, setModalAdmin] = useState({ show: false, targetUser: null, accion: '' });
  const [enviandoAdmin, setEnviandoAdmin] = useState(false);
  const [errorAdmin, setErrorAdmin] = useState('');

  useEffect(() => {
    api.getUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]))
      .finally(() => setCargando(false));
  }, []);

  const totalAlumnos = usuarios.filter((u) => u.id_rol === 1).length;
  const totalInscripciones = usuarios.filter((u) => u.nombre_club).length;

  const usuariosFiltrados = (() => {
    const q = busqueda.toLowerCase().trim();
    const porRol = filtroRol ? usuarios.filter((u) => String(u.id_rol) === filtroRol) : usuarios;
    return q
      ? porRol.filter(
          (u) =>
            String(u.id_usuario).includes(q) ||
            u.nombre_completo.toLowerCase().includes(q) ||
            u.correo_institucional.toLowerCase().includes(q)
        )
      : porRol;
  })();

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

  const handleRemoveFromClub = useCallback(async (userId) => {
    if (!window.confirm('¿Estás seguro de dar de baja a este alumno de su club?')) return;
    try {
      await api.removeFromClub(userId);
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [setErrorFeedback]);

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

  const handleEliminarUsuario = useCallback(async (userId, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteUser(userId);
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
      setFeedback(`Usuario "${nombre}" eliminado correctamente`);
    } catch (err) {
      setErrorFeedback(err.message);
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

  const abrirModalAdmin = useCallback((user, accion) => {
    setModalAdmin({ show: true, targetUser: user, accion });
    setErrorAdmin('');
  }, []);

  const manejarAdminAction = useCallback(async (password) => {
    const { targetUser, accion } = modalAdmin;
    setEnviandoAdmin(true);
    setErrorAdmin('');
    try {
      await api.adminAction(targetUser.id_usuario, accion, password);
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
      setFeedback(
        accion === 'promote'
          ? `"${targetUser.nombre_completo}" ahora es administrador`
          : `"${targetUser.nombre_completo}" ya no es administrador`
      );
      setModalAdmin({ show: false, targetUser: null, accion: '' });
    } catch (err) {
      setErrorAdmin(err.message);
    } finally {
      setEnviandoAdmin(false);
    }
  }, [modalAdmin, setFeedback]);

  const cerrarModalAdmin = useCallback(() => {
    setModalAdmin({ show: false, targetUser: null, accion: '' });
    setErrorAdmin('');
  }, []);

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
    manejarAdminAction,
    cerrarModalAdmin,
  };
}
