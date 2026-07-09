/* Hook del panel de administración: gestiona estado de usuarios, clubes, feedback, historial y modales. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export function usePanelAdmin(usuario) {
  const { esOscuro, cardCls, tableBg, thCls, tdCls, tdTitle, sbBg, sbItemBase, sbItemActive, sbItemInactive, selectCls, inputCls, labelCls, tema } = useTheme();
  const [vistaActiva, setVistaActiva] = useState('resumen');
  const [usuarios, setUsuarios] = useState([]);
  const [clubes, setClubes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [asignando, setAsignando] = useState({});
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [editandoClub, setEditandoClub] = useState(null);
  const [formularioClub, setFormularioClub] = useState({ nombre_club: '', descripcion: '', categoria: '', cupo_maximo: '', imagen_portada: '' });
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [feedback, setFeedback] = useState('');
  const [errorFeedback, setErrorFeedback] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [busquedaClubes, setBusquedaClubes] = useState('');
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
  const [formularioUsuario, setFormularioUsuario] = useState({ nombre_completo: '', correo_institucional: '', contrasena: '', id_rol: 1 });
  const [enviandoUsuario, setEnviandoUsuario] = useState(false);
  const [errorModalUsuario, setErrorModalUsuario] = useState('');
  const [modalAdmin, setModalAdmin] = useState({ show: false, targetUser: null, accion: '' });
  const [enviandoAdmin, setEnviandoAdmin] = useState(false);
  const [errorAdmin, setErrorAdmin] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const [u, c] = await Promise.all([
          api.getUsuarios(),
          api.getClubes(),
        ]);
        setUsuarios(u);
        setClubes(c);
      } catch {
        setUsuarios([]);
        setClubes([]);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const totalAlumnos = usuarios.filter((u) => u.id_rol === 1).length;
  const clubesActivos = clubes.filter((c) => c.id_estatus_club === 1).length;
  const clubesActivosLista = clubes.filter((c) => c.id_estatus_club === 1);

  const totalInscripciones = usuarios.filter((u) => u.nombre_club).length;

  const filtrados = (() => {
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

  const clubesFiltrados = (() => {
    const q = busquedaClubes.toLowerCase().trim();
    return q
      ? clubes.filter(
          (c) =>
            c.nombre_club.toLowerCase().includes(q) ||
            (c.categoria && c.categoria.toLowerCase().includes(q))
        )
      : clubes;
  })();

  const manejarCambioRol = useCallback(async (userId, nuevoRolId) => {
    try {
      await api.updateUserRol(userId, nuevoRolId);
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, []);

  const manejarDarBaja = useCallback(async (userId) => {
    if (!window.confirm('¿Estás seguro de dar de baja a este alumno de su club?')) return;
    try {
      await api.removeFromClub(userId);
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, []);

  const manejarAsignarClub = useCallback(async (userId, clubId) => {
    setAsignando((prev) => ({ ...prev, [userId]: true }));
    try {
      const resultado = await api.asignarClubAPresidente(userId, clubId || null);
      const [usuariosActualizados, clubesActualizados] = await Promise.all([
        api.getUsuarios(),
        api.getClubes(),
      ]);
      setUsuarios(usuariosActualizados);
      setClubes(clubesActualizados);
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
  }, []);

  const manejarCambioEstatus = useCallback(async (clubId, nuevoEstatusId) => {
    if (nuevoEstatusId === 3 && !window.confirm('¿Estás seguro de dar de baja este club? Los miembros serán notificados.')) return;
    try {
      await api.updateClubEstatus(clubId, nuevoEstatusId);
      const actualizados = await api.getClubes();
      setClubes(actualizados);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, []);

  const abrirModalCrear = useCallback(() => {
    setFormularioClub({ nombre_club: '', descripcion: '', categoria: '', cupo_maximo: '', imagen_portada: '' });
    setEditandoClub(null);
    setErrorModal('');
    setMostrarModalCrear(true);
  }, []);

  const abrirModalEditar = useCallback((club) => {
    setFormularioClub({
      nombre_club: club.nombre_club,
      descripcion: club.descripcion || '',
      categoria: club.categoria,
      cupo_maximo: String(club.cupo_maximo),
      imagen_portada: club.imagen_portada || '',
    });
    setEditandoClub(club);
    setErrorModal('');
    setMostrarModalCrear(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setMostrarModalCrear(false);
  }, []);

  const guardarClub = useCallback(async (e) => {
    e.preventDefault();
    setErrorModal('');
    if (!formularioClub.nombre_club.trim() || !formularioClub.descripcion.trim() || !formularioClub.categoria.trim() || !formularioClub.cupo_maximo) {
      setErrorModal('Todos los campos son obligatorios');
      return;
    }
    if (!editandoClub && !formularioClub.imagen_portada.trim()) {
      setErrorModal('La imagen del club es obligatoria');
      return;
    }
    if (editandoClub && !window.confirm(`¿Guardar los cambios en "${editandoClub.nombre_club}"?`)) return;
    setEnviando(true);
    try {
      if (editandoClub) {
        await api.updateClub(editandoClub.id_club, {
          nombre_club: formularioClub.nombre_club,
          descripcion: formularioClub.descripcion,
          categoria: formularioClub.categoria,
          cupo_maximo: Number(formularioClub.cupo_maximo),
          imagen_portada: formularioClub.imagen_portada || null,
        });
        setFeedback('Club actualizado correctamente');
      } else {
        await api.createClub({
          nombre_club: formularioClub.nombre_club,
          descripcion: formularioClub.descripcion,
          categoria: formularioClub.categoria,
          cupo_maximo: Number(formularioClub.cupo_maximo),
          imagen_portada: formularioClub.imagen_portada || null,
        });
        setFeedback('Club creado correctamente');
      }
      const actualizados = await api.getClubes();
      setClubes(actualizados);
      setMostrarModalCrear(false);
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setEnviando(false);
    }
  }, [formularioClub, editandoClub]);

  const manejarCambioFormularioClub = useCallback((e) => {
    const { name, value } = e.target;
    setFormularioClub((prev) => ({ ...prev, [name]: value }));
  }, []);

  const subirImagen = useCallback(async (file) => {
    try {
      const result = await api.uploadImagen(file);
      setFormularioClub((prev) => ({ ...prev, imagen_portada: result.url }));
    } catch (err) {
      setErrorModal(err.message);
    }
  }, []);

  const abrirModalCrearUsuario = useCallback(() => {
    setFormularioUsuario({ nombre_completo: '', correo_institucional: '', contrasena: '', id_rol: 1 });
    setErrorModalUsuario('');
    setMostrarModalUsuario(true);
  }, []);

  const cerrarModalUsuario = useCallback(() => {
    setMostrarModalUsuario(false);
  }, []);

  const manejarCambioFormularioUsuario = useCallback((e) => {
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
  }, [formularioUsuario]);

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
  }, [modalAdmin]);

  const cerrarModalAdmin = useCallback(() => {
    setModalAdmin({ show: false, targetUser: null, accion: '' });
    setErrorAdmin('');
  }, []);

  const manejarAsignarAlumnoClub = useCallback(async (id_usuario, id_club) => {
    setAsignando((prev) => ({ ...prev, [id_usuario]: true }));
    try {
      const result = await api.asignarAlumnoClub(id_usuario, id_club);
      const [usuariosActualizados, clubesActualizados] = await Promise.all([
        api.getUsuarios(),
        api.getClubes(),
      ]);
      setUsuarios(usuariosActualizados);
      setClubes(clubesActualizados);
      setFeedback(result.message || 'Alumno asignado correctamente');
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setAsignando((prev) => ({ ...prev, [id_usuario]: false }));
    }
  }, []);

  const manejarEliminarUsuario = useCallback(async (userId, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteUser(userId);
      const actualizados = await api.getUsuarios();
      setUsuarios(actualizados);
      setFeedback(`Usuario "${nombre}" eliminado correctamente`);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, []);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(''), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  useEffect(() => {
    if (errorFeedback) {
      const t = setTimeout(() => setErrorFeedback(''), 4000);
      return () => clearTimeout(t);
    }
  }, [errorFeedback]);

  const cargarHistorial = useCallback(() => {
    setCargandoHistorial(true);
    api.getHistorial()
      .then(setHistorial)
      .catch(() => setHistorial([]))
      .finally(() => setCargandoHistorial(false));
  }, []);

  useEffect(() => {
    if (vistaActiva === 'historial') {
      cargarHistorial();
    }
  }, [vistaActiva, cargarHistorial]);

  return {
    vistaActiva,
    setVistaActiva,
    usuarios,
    clubes,
    loading: cargando,
    asignando,
    showModalCrear: mostrarModalCrear,
    editandoClub,
    formClub: formularioClub,
    enviando,
    modalError: errorModal,
    feedback,
    setFeedback,
    errorFeedback,
    busqueda,
    setBusqueda,
    filtroRol,
    setFiltroRol,
    busquedaClubes,
    setBusquedaClubes,
    filtrados,
    usuariosFiltrados: filtrados,
    clubesFiltrados,
    historial,
    historialLoading: cargandoHistorial,
    isDark: esOscuro,
    totalAlumnos,
    clubesActivos,
    clubesActivosList: clubesActivosLista,
    totalInscripciones,
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
    handleRoleChange: manejarCambioRol,
    handleRemoveFromClub: manejarDarBaja,
    handleAsignarClub: manejarAsignarClub,
    handleStatusChange: manejarCambioEstatus,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModal,
    guardarClub,
    handleClubFormChange: manejarCambioFormularioClub,
    subirImagen,
    cargarHistorial,
    showModalUsuario: mostrarModalUsuario,
    formUsuario: formularioUsuario,
    enviandoUsuario,
    errorModalUsuario,
    abrirModalCrearUsuario,
    cerrarModalUsuario,
    handleUsuarioFormChange: manejarCambioFormularioUsuario,
    guardarUsuario,
    handleEliminarUsuario: manejarEliminarUsuario,
    handleAsignarAlumnoClub: manejarAsignarAlumnoClub,
    modalAdmin: modalAdmin,
    enviandoAdmin,
    errorAdmin,
    abrirModalAdmin,
    manejarAdminAction,
    cerrarModalAdmin,
  };
}
