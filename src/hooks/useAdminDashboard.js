import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useAdminDashboard(user, tema, modoOscuro) {
  const [vistaActiva, setVistaActiva] = useState('resumen');
  const [usuarios, setUsuarios] = useState([]);
  const [clubes, setClubes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asignando, setAsignando] = useState({});
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [editandoClub, setEditandoClub] = useState(null);
  const [formClub, setFormClub] = useState({ nombre_club: '', categoria: '', cupo_maximo: '' });
  const [enviando, setEnviando] = useState(false);
  const [modalError, setModalError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [errorFeedback, setErrorFeedback] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [historial, setHistorial] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  useEffect(() => {
    async function load() {
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
        setLoading(false);
      }
    }
    load();
  }, []);

  const isDark = modoOscuro;

  const totalAlumnos = usuarios.filter((u) => u.id_rol === 1).length;
  const clubesActivos = clubes.filter((c) => c.id_estatus_club === 1).length;
  const clubesActivosList = clubes.filter((c) => c.id_estatus_club === 1);

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

  const cardCls = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const tableBg = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const thCls = isDark ? 'text-slate-500' : 'text-slate-600';
  const tdCls = isDark ? 'text-slate-400' : 'text-slate-600';
  const tdTitle = isDark ? 'text-white' : 'text-slate-900';
  const sbBg = isDark ? 'bg-[#0a1128] border-slate-800' : 'bg-slate-900 border-slate-700';
  const sbItemBase = 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer';
  const sbItemActive = 'bg-amber-400/20 text-amber-400 border border-amber-400/30';
  const sbItemInactive = isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/50';
  const selectCls = `text-xs font-bold rounded-lg px-3 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-40 disabled:cursor-not-allowed ${
    isDark ? 'bg-[#18223f] border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
  }`;
  const inputCls = `w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
    isDark ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
  }`;
  const labelCls = 'block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5';

  const handleRoleChange = useCallback(async (userId, newRoleId) => {
    try {
      await api.updateUserRol(userId, newRoleId);
      const updated = await api.getUsuarios();
      setUsuarios(updated);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, []);

  const handleRemoveFromClub = useCallback(async (userId) => {
    if (!window.confirm('¿Estás seguro de dar de baja a este alumno de su club?')) return;
    try {
      await api.removeFromClub(userId);
      const updated = await api.getUsuarios();
      setUsuarios(updated);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, []);

  const handleAsignarClub = useCallback(async (userId, clubId) => {
    setAsignando((prev) => ({ ...prev, [userId]: true }));
    try {
      const result = await api.asignarClubAPresidente(userId, clubId || null);
      const [updatedUsers, updatedClubes] = await Promise.all([
        api.getUsuarios(),
        api.getClubes(),
      ]);
      setUsuarios(updatedUsers);
      setClubes(updatedClubes);
      if (result.nombre_club) {
        setFeedback(`Presidente asignado a "${result.nombre_club}" correctamente`);
      } else {
        setFeedback('Presidente desasignado del club correctamente');
      }
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setAsignando((prev) => ({ ...prev, [userId]: false }));
    }
  }, []);

  const handleStatusChange = useCallback(async (clubId, newStatusId) => {
    try {
      await api.updateClubEstatus(clubId, newStatusId);
      const updated = await api.getClubes();
      setClubes(updated);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, []);

  const abrirModalCrear = useCallback(() => {
    setFormClub({ nombre_club: '', categoria: '', cupo_maximo: '' });
    setEditandoClub(null);
    setModalError('');
    setShowModalCrear(true);
  }, []);

  const abrirModalEditar = useCallback((club) => {
    setFormClub({
      nombre_club: club.nombre_club,
      categoria: club.categoria,
      cupo_maximo: String(club.cupo_maximo),
    });
    setEditandoClub(club);
    setModalError('');
    setShowModalCrear(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setShowModalCrear(false);
  }, []);

  const guardarClub = useCallback(async (e) => {
    e.preventDefault();
    setModalError('');
    if (!formClub.nombre_club.trim() || !formClub.categoria.trim() || !formClub.cupo_maximo) {
      setModalError('Todos los campos son obligatorios');
      return;
    }
    setEnviando(true);
    try {
      if (editandoClub) {
        await api.updateClub(editandoClub.id_club, {
          nombre_club: formClub.nombre_club,
          categoria: formClub.categoria,
          cupo_maximo: Number(formClub.cupo_maximo),
        });
        setFeedback('Club actualizado correctamente');
      } else {
        await api.createClub({
          nombre_club: formClub.nombre_club,
          categoria: formClub.categoria,
          cupo_maximo: Number(formClub.cupo_maximo),
        });
        setFeedback('Club creado correctamente');
      }
      const updated = await api.getClubes();
      setClubes(updated);
      setShowModalCrear(false);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setEnviando(false);
    }
  }, [formClub, editandoClub]);

  const handleClubFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormClub((prev) => ({ ...prev, [name]: value }));
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
    setHistorialLoading(true);
    api.getHistorial()
      .then(setHistorial)
      .catch(() => setHistorial([]))
      .finally(() => setHistorialLoading(false));
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
    loading,
    asignando,
    showModalCrear,
    editandoClub,
    formClub,
    enviando,
    modalError,
    feedback,
    setFeedback,
    errorFeedback,
    busqueda,
    setBusqueda,
    filtrados,
    historial,
    historialLoading,
    isDark,
    totalAlumnos,
    clubesActivos,
    clubesActivosList,
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
    user,
    handleRoleChange,
    handleRemoveFromClub,
    handleAsignarClub,
    handleStatusChange,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModal,
    guardarClub,
    handleClubFormChange,
    cargarHistorial,
  };
}
