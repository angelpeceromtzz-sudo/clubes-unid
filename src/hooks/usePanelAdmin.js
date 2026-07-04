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
  const [formularioClub, setFormularioClub] = useState({ nombre_club: '', categoria: '', cupo_maximo: '' });
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [feedback, setFeedback] = useState('');
  const [errorFeedback, setErrorFeedback] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

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
    return q
      ? usuarios.filter(
          (u) =>
            String(u.id_usuario).includes(q) ||
            u.nombre_completo.toLowerCase().includes(q) ||
            u.correo_institucional.toLowerCase().includes(q)
        )
      : usuarios;
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
    try {
      await api.updateClubEstatus(clubId, nuevoEstatusId);
      const actualizados = await api.getClubes();
      setClubes(actualizados);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, []);

  const abrirModalCrear = useCallback(() => {
    setFormularioClub({ nombre_club: '', categoria: '', cupo_maximo: '' });
    setEditandoClub(null);
    setErrorModal('');
    setMostrarModalCrear(true);
  }, []);

  const abrirModalEditar = useCallback((club) => {
    setFormularioClub({
      nombre_club: club.nombre_club,
      categoria: club.categoria,
      cupo_maximo: String(club.cupo_maximo),
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
    if (!formularioClub.nombre_club.trim() || !formularioClub.categoria.trim() || !formularioClub.cupo_maximo) {
      setErrorModal('Todos los campos son obligatorios');
      return;
    }
    setEnviando(true);
    try {
      if (editandoClub) {
        await api.updateClub(editandoClub.id_club, {
          nombre_club: formularioClub.nombre_club,
          categoria: formularioClub.categoria,
          cupo_maximo: Number(formularioClub.cupo_maximo),
        });
        setFeedback('Club actualizado correctamente');
      } else {
        await api.createClub({
          nombre_club: formularioClub.nombre_club,
          categoria: formularioClub.categoria,
          cupo_maximo: Number(formularioClub.cupo_maximo),
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
    filtrados,
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
    cargarHistorial,
  };
}
