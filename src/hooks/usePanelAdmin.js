import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function usePanelAdmin(usuario, tema, modoOscuro) {
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

  const esOscuro = modoOscuro;

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

  const cardCls = esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const tableBg = esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const thCls = esOscuro ? 'text-slate-500' : 'text-slate-600';
  const tdCls = esOscuro ? 'text-slate-400' : 'text-slate-600';
  const tdTitle = esOscuro ? 'text-white' : 'text-slate-900';
  const sbBg = esOscuro ? 'bg-[#0a1128] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const sbItemBase = 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer';
  const sbItemActive = 'bg-amber-400/20 text-amber-400 border border-amber-400/30';
  const sbItemInactive = esOscuro ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100';
  const selectCls = `text-xs font-bold rounded-lg px-3 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-40 disabled:cursor-not-allowed ${
    esOscuro ? 'bg-[#18223f] border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
  }`;
  const inputCls = `w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
    esOscuro ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
  }`;
  const labelCls = 'block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5';

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
